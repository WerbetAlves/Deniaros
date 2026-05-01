"use server";

import { redirect } from "next/navigation";
import {
  normalizeCurrency,
  normalizeScheduledAmount,
  normalizeScheduleKind,
  normalizeScheduleRecurrence,
  normalizeScheduleStatus,
  toScheduleStatusDb
} from "@/lib/finance-admin";
import { getNextScheduledDueDate, getScheduledStatusForDate } from "@/lib/finance";
import { getWorkspaceContext } from "@/lib/workspace-context";

type ScheduledItemAuditSnapshot = {
  account_id: string;
  amount: number | string;
  category_id: string | null;
  currency: string;
  due_on: string;
  id: string;
  kind: "bill" | "deposit" | "saving";
  payee_id: string | null;
  recurrence: "once" | "weekly" | "monthly";
  status: "scheduled" | "due_soon" | "overdue" | "paid";
  title: string;
};

export async function createScheduledItem(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const title = String(formData.get("title") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const defaultCurrency = String(formData.get("defaultCurrency") ?? "BRL");
  const kind = normalizeScheduleKind(formData.get("kind"));

  if (!title || !accountId || !dueDate) {
    redirect("/financial-agenda?error=Preencha título, conta e vencimento.");
  }

  const { error } = await supabase.from("scheduled_items").insert({
    workspace_id: workspaceId,
    account_id: accountId,
    category_id: parseOptionalValue(formData.get("categoryId")),
    payee_id: parseOptionalValue(formData.get("payeeId")),
    kind,
    title,
    amount: normalizeScheduledAmount(kind, formData.get("amount")),
    currency: normalizeCurrency(formData.get("currency"), defaultCurrency),
    due_on: dueDate,
    recurrence: normalizeScheduleRecurrence(formData.get("recurrence")),
    status: toScheduleStatusDb(normalizeScheduleStatus(formData.get("status"))),
    updated_at: new Date().toISOString()
  });

  if (error) {
    redirect(`/financial-agenda?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/financial-agenda?success=Item agendado criado.");
}

export async function updateScheduledItem(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const defaultCurrency = String(formData.get("defaultCurrency") ?? "BRL");
  const kind = normalizeScheduleKind(formData.get("kind"));

  if (!itemId || !title || !accountId || !dueDate) {
    redirect("/financial-agenda?error=Preencha o item da agenda antes de salvar.");
  }

  const { data: existingItem, error: loadError } = await supabase
    .from("scheduled_items")
    .select("id,account_id,category_id,payee_id,kind,title,amount,currency,due_on,recurrence,status")
    .eq("id", itemId)
    .eq("workspace_id", workspaceId)
    .single<ScheduledItemAuditSnapshot>();

  if (loadError || !existingItem) {
    redirect("/financial-agenda?error=Item da agenda não encontrado.");
  }

  const updatePayload = {
    account_id: accountId,
    category_id: parseOptionalValue(formData.get("categoryId")),
    payee_id: parseOptionalValue(formData.get("payeeId")),
    kind,
    title,
    amount: normalizeScheduledAmount(kind, formData.get("amount")),
    currency: normalizeCurrency(formData.get("currency"), defaultCurrency),
    due_on: dueDate,
    recurrence: normalizeScheduleRecurrence(formData.get("recurrence")),
    status: toScheduleStatusDb(normalizeScheduleStatus(formData.get("status"))),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from("scheduled_items")
    .update(updatePayload)
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`/financial-agenda?error=${encodeURIComponent(error.message)}`);
  }

  const auditError = await recordAgendaAuditEvent({
    supabase,
    workspaceId,
    transactionId: null,
    actorId: user.id,
    eventType: "scheduled_updated",
    beforeStatus: existingItem.status,
    afterStatus: updatePayload.status,
    note: "Compromisso da agenda atualizado manualmente.",
    metadata: {
      before: existingItem,
      after: updatePayload,
      scheduled_item_id: itemId
    }
  });

  if (auditError) {
    redirect(
      `/financial-agenda?success=${encodeURIComponent(
        "Item atualizado. Auditoria pendente: execute a migration 0012_transaction_audit_events.sql e 0013_manual_audit_event_types.sql."
      )}`
    );
  }

  redirect("/financial-agenda?success=Item da agenda atualizado.");
}

export async function deleteScheduledItem(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "").trim();

  if (!itemId) {
    redirect("/financial-agenda?error=Registro inválido para exclusão.");
  }

  const { error: auditPreflightError } = await supabase
    .from("transaction_audit_events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1);

  if (auditPreflightError) {
    if (auditPreflightError.code === "42P01" || auditPreflightError.code === "42703") {
      redirect(
        "/financial-agenda?error=Execute%20as%20migrations%200012_transaction_audit_events.sql%20e%200013_manual_audit_event_types.sql%20antes%20de%20remover%20itens."
      );
    }

    redirect(`/financial-agenda?error=${encodeURIComponent(auditPreflightError.message)}`);
  }

  const { data: existingItem, error: loadError } = await supabase
    .from("scheduled_items")
    .select("id,account_id,category_id,payee_id,kind,title,amount,currency,due_on,recurrence,status")
    .eq("id", itemId)
    .eq("workspace_id", workspaceId)
    .single<ScheduledItemAuditSnapshot>();

  if (loadError || !existingItem) {
    redirect("/financial-agenda?error=Item da agenda não encontrado para exclusão.");
  }

  const { error } = await supabase
    .from("scheduled_items")
    .delete()
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`/financial-agenda?error=${encodeURIComponent(error.message)}`);
  }

  const auditError = await recordAgendaAuditEvent({
    supabase,
    workspaceId,
    transactionId: null,
    actorId: user.id,
    eventType: "scheduled_deleted",
    beforeStatus: existingItem.status,
    afterStatus: null,
    note: "Compromisso removido manualmente da agenda.",
    metadata: {
      before: existingItem,
      removed_scheduled_item_id: existingItem.id
    }
  });

  if (auditError) {
    redirect(`/financial-agenda?error=${encodeURIComponent(auditError.message)}`);
  }

  redirect("/financial-agenda?success=Item removido da agenda.");
}

export async function settleScheduledItem(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "").trim();
  const requestedSettlementDate = String(formData.get("settlementDate") ?? "").trim();

  if (!itemId) {
    redirect("/financial-agenda?error=Registro inválido para baixa.");
  }

  const { data: item, error: loadError } = await supabase
    .from("scheduled_items")
    .select("id,account_id,category_id,payee_id,title,amount,currency,due_on,recurrence,status")
    .eq("id", itemId)
    .eq("workspace_id", workspaceId)
    .single<{
      id: string;
      account_id: string;
      category_id: string | null;
      payee_id: string | null;
      title: string;
      amount: number | string;
      currency: string;
      due_on: string;
      recurrence: "once" | "weekly" | "monthly";
      status: "scheduled" | "due_soon" | "overdue" | "paid";
    }>();

  if (loadError || !item) {
    redirect("/financial-agenda?error=Item da agenda não encontrado.");
  }

  if (item.status === "paid" && item.recurrence === "once") {
    redirect("/financial-agenda?error=Este item já foi baixado.");
  }

  const settlementDate = normalizeSettlementDate(requestedSettlementDate);
  const occurrenceDate = item.due_on;
  const transactionPayload = {
    workspace_id: workspaceId,
    account_id: item.account_id,
    category_id: item.category_id,
    payee_id: item.payee_id,
    description: item.title,
    amount: Number(item.amount),
    currency: item.currency,
    occurred_on: settlementDate,
    scheduled_item_id: item.id,
    scheduled_occurrence_date: occurrenceDate,
    status: "posted" as const,
    source: "recurring" as const
  };
  const transactionResult = await supabase
    .from("transactions")
    .insert(transactionPayload)
    .select("id")
    .single<{ id: string }>();

  if (transactionResult.error) {
    if (transactionResult.error.code === "23505") {
      redirect("/financial-agenda?error=Esta ocorrência já foi baixada nos lançamentos.");
    }

    if (transactionResult.error.code === "42703") {
      redirect(
        "/financial-agenda?error=Execute a migration 0010_scheduled_settlement_trace.sql para ativar baixas rastreáveis."
      );
    }

    redirect(`/financial-agenda?error=${encodeURIComponent(transactionResult.error.message)}`);
  }

  const nextDueDate =
    item.recurrence === "once"
      ? null
      : getNextScheduledDueDate(item.due_on, item.recurrence);
  const updatePayload =
    item.recurrence === "once"
      ? {
          status: "paid" as const,
          updated_at: new Date().toISOString()
        }
      : {
          due_on: nextDueDate,
          status: toScheduleStatusDb(getScheduledStatusForDate(nextDueDate ?? item.due_on)),
          updated_at: new Date().toISOString()
        };

  const { error } = await supabase
    .from("scheduled_items")
    .update(updatePayload)
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    await supabase
      .from("transactions")
      .delete()
      .eq("id", transactionResult.data?.id ?? "")
      .eq("workspace_id", workspaceId);

    redirect(`/financial-agenda?error=${encodeURIComponent(error.message)}`);
  }

  const auditError = await recordAgendaAuditEvent({
    supabase,
    workspaceId,
    transactionId: transactionResult.data?.id ?? null,
    actorId: user.id,
    eventType: "scheduled_settled",
    beforeStatus: item.status,
    afterStatus: updatePayload.status,
    note: "Compromisso baixado e registrado nos lançamentos.",
    metadata: {
      before: item,
      after: updatePayload,
      transaction: transactionPayload,
      scheduled_item_id: item.id,
      settlement_date: settlementDate,
      occurrence_date: occurrenceDate
    }
  });

  if (auditError) {
    redirect(
      `/financial-agenda?success=${encodeURIComponent(
        "Item baixado. Auditoria pendente: execute a migration 0012_transaction_audit_events.sql e 0013_manual_audit_event_types.sql."
      )}`
    );
  }

  redirect(
    `/financial-agenda?success=${encodeURIComponent(
      item.recurrence === "once"
        ? "Item baixado e registrado nos lançamentos."
        : "Item registrado e próxima recorrência reagendada."
    )}`
  );
}

function parseOptionalValue(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw || null;
}

function normalizeSettlementDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Date().toISOString().slice(0, 10);
}

async function recordAgendaAuditEvent({
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
  eventType: "scheduled_settled" | "scheduled_updated" | "scheduled_deleted";
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
    source: "financial-agenda",
    before_status: beforeStatus,
    after_status: afterStatus,
    note,
    metadata
  });

  return error;
}

