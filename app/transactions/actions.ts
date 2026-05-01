"use server";

import { redirect } from "next/navigation";
import { getNextScheduledDueDate, getScheduledStatusForDate } from "@/lib/finance";
import { toScheduleStatusDb } from "@/lib/finance-admin";
import { getWorkspaceContext } from "@/lib/workspace-context";

type TransactionAuditSnapshot = {
  account_id: string;
  amount: number | string | null;
  category_id: string | null;
  currency: string;
  description: string;
  id: string;
  occurred_on: string;
  payee_id: string | null;
  scheduled_item_id: string | null;
  scheduled_occurrence_date: string | null;
  reconciled_at?: string | null;
  reconciled_by?: string | null;
  source: string | null;
  status: "pending" | "posted";
  transfer_account_id: string | null;
};

type ScheduledItemRestoreSnapshot = {
  due_on: string;
  id: string;
  recurrence: "once" | "weekly" | "monthly";
  status: "scheduled" | "due_soon" | "overdue" | "paid";
};

export async function createTransaction(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const payload = await resolveTransactionPayload({
    formData,
    workspaceId,
    supabase,
    failurePath: "/transactions/new"
  });

  const insertPayload = {
    workspace_id: workspaceId,
    account_id: payload.accountId,
    transfer_account_id: payload.transferAccountId,
    category_id: payload.categoryId,
    payee_id: payload.payeeId,
    description: payload.description,
    amount: payload.amount,
    currency: payload.currency,
    occurred_on: payload.occurredOn,
    status: payload.status,
    source: "manual"
  };
  const { data: createdTransaction, error } = await supabase
    .from("transactions")
    .insert(insertPayload)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    redirect(`/transactions/new?error=${encodeURIComponent(error.message)}`);
  }

  const auditError = await recordTransactionAuditEvent({
    supabase,
    workspaceId,
    transactionId: createdTransaction?.id ?? null,
    actorId: user.id,
    eventType: "transaction_created",
    beforeStatus: null,
    afterStatus: payload.status,
    note: "Movimento criado manualmente.",
    metadata: {
      after: insertPayload
    }
  });

  if (auditError) {
    redirect(
      `/transactions?success=${encodeURIComponent(
        "Movimento criado. Auditoria pendente: execute a migration 0012_transaction_audit_events.sql."
      )}`
    );
  }

  redirect("/transactions?success=Movimento criado.");
}

export async function updateTransaction(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");

  if (!itemId) {
    redirect("/transactions?error=Movimento inválido para atualização.");
  }

  const payload = await resolveTransactionPayload({
    formData,
    workspaceId,
    supabase,
    failurePath: "/transactions"
  });
  const existingResult = await supabase
    .from("transactions")
    .select("id,account_id,transfer_account_id,category_id,payee_id,description,amount,currency,occurred_on,status,source,scheduled_item_id,scheduled_occurrence_date")
    .eq("id", itemId)
    .eq("workspace_id", workspaceId)
    .single<TransactionAuditSnapshot>();

  if (!existingResult.data) {
    redirect("/transactions?error=Movimento não encontrado.");
  }

  const currentSource = String(existingResult.data.source ?? "manual");
  const isScheduledSettlement = Boolean(existingResult.data.scheduled_item_id);
  const isExternalAmountLocked =
    currentSource === "imported" || currentSource === "openfinance";
  const amountChangedInCents =
    toAmountInCents(payload.amount) !== toAmountInCents(existingResult.data.amount);

  if (isExternalAmountLocked && amountChangedInCents) {
    redirect(
      "/transactions?error=Este movimento veio de leitura externa e o valor não pode ser alterado."
    );
  }

  if (isScheduledSettlement) {
    const protectedFieldsChanged =
      payload.accountId !== existingResult.data.account_id ||
      payload.transferAccountId !== existingResult.data.transfer_account_id ||
      payload.currency !== existingResult.data.currency ||
      payload.occurredOn !== existingResult.data.occurred_on ||
      payload.status !== existingResult.data.status ||
      amountChangedInCents;

    if (protectedFieldsChanged) {
      redirect(
        "/transactions?error=Baixas da agenda preservam conta, valor, data e status para manter a rastreabilidade."
      );
    }
  }

  const updatePayload = isScheduledSettlement
    ? {
        account_id: existingResult.data.account_id,
        transfer_account_id: existingResult.data.transfer_account_id,
        category_id: payload.categoryId,
        payee_id: payload.payeeId,
        description: payload.description,
        amount: Number(existingResult.data.amount ?? 0),
        currency: existingResult.data.currency,
        occurred_on: existingResult.data.occurred_on,
        status: existingResult.data.status,
        updated_at: new Date().toISOString()
      }
    : {
        account_id: payload.accountId,
        transfer_account_id: payload.transferAccountId,
        category_id: payload.categoryId,
        payee_id: payload.payeeId,
        description: payload.description,
        amount: payload.amount,
        currency: payload.currency,
        occurred_on: payload.occurredOn,
        status: payload.status,
        updated_at: new Date().toISOString()
      };

  const { error } = await supabase
    .from("transactions")
    .update(updatePayload)
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`/transactions?error=${encodeURIComponent(error.message)}`);
  }

  const auditError = await recordTransactionAuditEvent({
    supabase,
    workspaceId,
    transactionId: itemId,
    actorId: user.id,
    eventType: "transaction_updated",
    beforeStatus: existingResult.data.status,
    afterStatus: updatePayload.status,
    note: isScheduledSettlement
      ? "Baixa da agenda atualizada sem alterar rastreabilidade."
      : "Movimento atualizado manualmente.",
    metadata: {
      before: existingResult.data,
      after: updatePayload
    }
  });

  if (auditError) {
    redirect(
      `/transactions?success=${encodeURIComponent(
        "Movimento atualizado. Auditoria pendente: execute a migration 0012_transaction_audit_events.sql."
      )}`
    );
  }

  redirect("/transactions?success=Movimento atualizado.");
}

export async function deleteTransaction(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");

  if (!itemId) {
    redirect("/transactions?error=Movimento inválido para exclusão.");
  }

  const { error: auditPreflightError } = await supabase
    .from("transaction_audit_events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1);

  if (auditPreflightError) {
    if (auditPreflightError.code === "42P01" || auditPreflightError.code === "42703") {
      redirect(
        "/transactions?error=Execute%20a%20migration%200012_transaction_audit_events.sql%20antes%20de%20remover%20lan%C3%A7amentos."
      );
    }

    redirect(`/transactions?error=${encodeURIComponent(auditPreflightError.message)}`);
  }

  const { data: existingTransaction, error: loadError } = await supabase
    .from("transactions")
    .select("id,account_id,transfer_account_id,category_id,payee_id,description,amount,currency,occurred_on,status,source,scheduled_item_id,scheduled_occurrence_date")
    .eq("id", itemId)
    .eq("workspace_id", workspaceId)
    .single<TransactionAuditSnapshot>();

  if (loadError || !existingTransaction) {
    redirect("/transactions?error=Movimento não encontrado para exclusão.");
  }

  const linkedSchedule = await loadLinkedScheduleForRestore({
    supabase,
    workspaceId,
    scheduledItemId: existingTransaction.scheduled_item_id,
    occurrenceDate: existingTransaction.scheduled_occurrence_date
  });

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`/transactions?error=${encodeURIComponent(error.message)}`);
  }

  const scheduleRestorePayload = linkedSchedule
    ? buildScheduleRestorePayload(linkedSchedule, existingTransaction.scheduled_occurrence_date)
    : null;

  if (scheduleRestorePayload && linkedSchedule) {
    const { error: restoreError } = await supabase
      .from("scheduled_items")
      .update(scheduleRestorePayload)
      .eq("id", linkedSchedule.id)
      .eq("workspace_id", workspaceId);

    if (restoreError) {
      redirect(`/transactions?error=${encodeURIComponent(restoreError.message)}`);
    }
  }

  const auditError = await recordTransactionAuditEvent({
    supabase,
    workspaceId,
    transactionId: null,
    actorId: user.id,
    eventType: "transaction_deleted",
    beforeStatus: existingTransaction.status,
    afterStatus: null,
    note: scheduleRestorePayload
      ? "Movimento removido manualmente e compromisso da agenda reaberto."
      : "Movimento removido manualmente.",
    metadata: {
      before: existingTransaction,
      restored_scheduled_item: scheduleRestorePayload
        ? {
            id: linkedSchedule?.id,
            after: scheduleRestorePayload
          }
        : null,
      removed_transaction_id: existingTransaction.id
    }
  });

  if (auditError) {
    redirect(`/transactions?error=${encodeURIComponent(auditError.message)}`);
  }

  redirect("/transactions?success=Movimento removido.");
}

export async function setTransactionReconciliation(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");
  const returnTo = normalizeReturnPath(formData.get("returnTo"));
  const shouldReconcile = String(formData.get("reconcile") ?? "true") === "true";

  if (!itemId) {
    redirect(withReturnMessage(returnTo, "error", "Movimento inválido para conferência."));
  }

  const { data: existingTransaction, error: loadError } = await supabase
    .from("transactions")
    .select("id,account_id,transfer_account_id,category_id,payee_id,description,amount,currency,occurred_on,status,source,scheduled_item_id,scheduled_occurrence_date,reconciled_at,reconciled_by")
    .eq("id", itemId)
    .eq("workspace_id", workspaceId)
    .single<TransactionAuditSnapshot>();

  if (loadError || !existingTransaction) {
    redirect(withReturnMessage(returnTo, "error", "Movimento não encontrado para conferência."));
  }

  if (existingTransaction.status !== "posted") {
    redirect(withReturnMessage(returnTo, "error", "Somente movimentos lançados podem ser conferidos."));
  }

  const updatePayload = {
    reconciled_at: shouldReconcile ? new Date().toISOString() : null,
    reconciled_by: shouldReconcile ? user.id : null,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase
    .from("transactions")
    .update(updatePayload)
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    if (error.code === "42703") {
      redirect(
        withReturnMessage(
          returnTo,
          "error",
          "Execute a migration 0024_transaction_reconciliation_flow.sql para usar conferência."
        )
      );
    }

    redirect(withReturnMessage(returnTo, "error", error.message));
  }

  const auditError = await recordTransactionAuditEvent({
    supabase,
    workspaceId,
    transactionId: itemId,
    actorId: user.id,
    eventType: shouldReconcile ? "transaction_reconciled" : "transaction_unreconciled",
    beforeStatus: existingTransaction.status,
    afterStatus: existingTransaction.status,
    note: shouldReconcile ? "Movimento marcado como conferido." : "Conferência removida do movimento.",
    metadata: {
      before: existingTransaction,
      after: updatePayload
    }
  });

  if (auditError) {
    redirect(
      withReturnMessage(
        returnTo,
        "success",
        shouldReconcile
          ? "Movimento conferido. Auditoria pendente: execute a migration 0024_transaction_reconciliation_flow.sql."
          : "Conferência removida. Auditoria pendente: execute a migration 0024_transaction_reconciliation_flow.sql."
      )
    );
  }

  redirect(
    withReturnMessage(
      returnTo,
      "success",
      shouldReconcile ? "Movimento conferido." : "Conferência removida."
    )
  );
}

async function loadLinkedScheduleForRestore({
  supabase,
  workspaceId,
  scheduledItemId,
  occurrenceDate
}: {
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"];
  workspaceId: string;
  scheduledItemId: string | null;
  occurrenceDate: string | null;
}) {
  if (!scheduledItemId || !occurrenceDate) {
    return null;
  }

  const { data } = await supabase
    .from("scheduled_items")
    .select("id,due_on,recurrence,status")
    .eq("id", scheduledItemId)
    .eq("workspace_id", workspaceId)
    .single<ScheduledItemRestoreSnapshot>();

  return data ?? null;
}

function buildScheduleRestorePayload(
  schedule: ScheduledItemRestoreSnapshot,
  occurrenceDate: string | null
) {
  if (!occurrenceDate) {
    return null;
  }

  const canRestoreOccurrence =
    schedule.recurrence === "once" ||
    schedule.due_on === getNextScheduledDueDate(occurrenceDate, schedule.recurrence);

  if (!canRestoreOccurrence) {
    return null;
  }

  return {
    due_on: occurrenceDate,
    status: toScheduleStatusDb(getScheduledStatusForDate(occurrenceDate)),
    updated_at: new Date().toISOString()
  };
}

async function resolveTransactionPayload({
  formData,
  workspaceId,
  supabase,
  failurePath
}: {
  formData: FormData;
  workspaceId: string;
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"];
  failurePath: string;
}) {
  const accountId = String(formData.get("accountId") ?? "");
  const transferAccountId = String(formData.get("transferAccountId") ?? "");
  const categoryId = String(formData.get("subcategoryId") || formData.get("categoryId") || "");
  const payeeId = String(formData.get("payeeId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const amountValue = Number(formData.get("amount") ?? 0);
  const direction = String(formData.get("direction") ?? "expense");
  const occurredOn = String(formData.get("occurredOn") ?? "");
  const status = normalizeTransactionStatus(formData.get("status"));

  if (!accountId || !description || !amountValue || !occurredOn) {
    redirect(`${failurePath}?error=Preencha os campos obrigatórios`);
  }

  if (direction === "transfer" && (!transferAccountId || transferAccountId === accountId)) {
    redirect(`${failurePath}?error=Escolha uma conta de destino valida para a transferência.`);
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("currency")
    .eq("id", accountId)
    .eq("workspace_id", workspaceId)
    .single<{ currency: string }>();

  if (!account) {
    redirect(`${failurePath}?error=Conta principal inválida.`);
  }

  if (direction === "transfer") {
    const destinationResult = await supabase
      .from("accounts")
      .select("currency")
      .eq("id", transferAccountId)
      .eq("workspace_id", workspaceId)
      .single<{ currency: string }>();

    if (!destinationResult.data) {
      redirect(`${failurePath}?error=Conta de destino inválida.`);
    }

    if (destinationResult.data.currency !== account.currency) {
      redirect(
        `${failurePath}?error=Transferências entre moedas diferentes ainda não estão disponíveis.`
      );
    }
  }

  const amount =
    direction === "expense" || direction === "transfer"
      ? -Math.abs(amountValue)
      : Math.abs(amountValue);

  return {
    accountId,
    transferAccountId: direction === "transfer" ? transferAccountId : null,
    categoryId: direction === "transfer" ? null : categoryId || null,
    payeeId: direction === "transfer" ? null : payeeId || null,
    description,
    amount,
    currency: account.currency ?? "BRL",
    occurredOn,
    status
  };
}

function normalizeTransactionStatus(value: FormDataEntryValue | null) {
  const raw = String(value ?? "posted");
  return raw === "pending" ? "pending" : "posted";
}

function toAmountInCents(value: number | string | null) {
  return Math.round(Number(value ?? 0) * 100);
}

function normalizeReturnPath(value: FormDataEntryValue | null) {
  const raw = String(value ?? "/transactions");

  if (raw.startsWith("/accounts") || raw.startsWith("/transactions")) {
    return raw;
  }

  return "/transactions";
}

function withReturnMessage(path: string, key: "error" | "success", message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(message)}`;
}

async function recordTransactionAuditEvent({
  supabase,
  workspaceId,
  transactionId,
  actorId,
  eventType,
  beforeStatus,
  afterStatus,
  note,
  metadata
}: {
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"];
  workspaceId: string;
  transactionId: string | null;
  actorId: string;
  eventType:
    | "transaction_created"
    | "transaction_updated"
    | "transaction_deleted"
    | "transaction_reconciled"
    | "transaction_unreconciled"
    | "manual_adjustment";
  beforeStatus: string | null;
  afterStatus: string | null;
  note: string;
  metadata: Record<string, unknown>;
}) {
  const { error } = await supabase.from("transaction_audit_events").insert({
    workspace_id: workspaceId,
    transaction_id: transactionId,
    actor_id: actorId,
    event_type: eventType,
    source: "transactions",
    before_status: beforeStatus,
    after_status: afterStatus,
    note,
    metadata
  });

  return error;
}
