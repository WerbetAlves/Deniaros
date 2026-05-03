"use server";

import { redirect } from "next/navigation";
import {
  applyImportRule,
  buildImportSummary,
  buildTransactionSignature,
  detectImportSourceType,
  findImportDuplicate,
  findPayeeIdByName,
  ImportRuleRow,
  mapImportRule,
  matchCategoryId,
  normalizeImportRuleMatchField,
  normalizeImportRuleMatchType,
  normalizeImportRuleStatus,
  parseImportStatement
} from "@/lib/imports";
import { getWorkspaceContext } from "@/lib/workspace-context";

type AccountRow = {
  currency: string;
  name: string;
};

type CategoryRow = {
  id: string;
  name: string;
  kind: "income" | "expense";
  parent_id: string | null;
};

type PayeeRow = {
  id: string;
  name: string;
  type: "person" | "company" | "place";
};

type TransactionRow = {
  account_id: string;
  amount: number;
  description: string;
  import_signature: string | null;
  occurred_on: string;
};

type ImportRuleQueryRow = ImportRuleRow & {
  created_at: string;
};

type ImportBatchInsertRow = {
  id: string;
};

type ImportedTransactionAuditRow = {
  amount: number;
  description: string;
  id: string;
  import_batch_id: string | null;
  import_rule_id: string | null;
  import_signature: string | null;
  occurred_on: string;
  status: "pending" | "posted";
};

export async function importTransactions(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const accountId = String(formData.get("accountId") ?? "");
  const status = String(formData.get("status") ?? "pending") === "posted" ? "posted" : "pending";
  const autoCreatePayees = String(formData.get("autoCreatePayees") ?? "") === "on";
  const duplicateStrategy = normalizeDuplicateStrategy(formData.get("duplicateStrategy"));
  const file = formData.get("statementFile");
  const pastedContent = String(formData.get("statementText") ?? "").trim();

  if (!accountId) {
    redirect("/imports?error=Escolha a conta que recebera o extrato.");
  }

  let content = pastedContent;

  if (!content && file instanceof File) {
    content = (await file.text()).trim();
  }

  if (!content) {
    redirect("/imports?error=Envie um CSV ou cole o conteúdo do extrato.");
  }

  const [
    accountResult,
    categoriesResult,
    payeesResult,
    transactionsResult,
    importRulesResult
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("name,currency")
      .eq("workspace_id", workspaceId)
      .eq("id", accountId)
      .single<AccountRow>(),
    supabase
      .from("categories")
      .select("id,name,kind,parent_id")
      .eq("workspace_id", workspaceId)
      .returns<CategoryRow[]>(),
    supabase
      .from("payees")
      .select("id,name,type")
      .eq("workspace_id", workspaceId)
      .returns<PayeeRow[]>(),
    supabase
      .from("transactions")
      .select("account_id,amount,description,occurred_on,import_signature")
      .eq("workspace_id", workspaceId)
      .eq("account_id", accountId)
      .returns<TransactionRow[]>(),
    supabase
      .from("import_rules")
      .select(
        "id,workspace_id,name,is_active,match_field,match_type,pattern,scope_account_id,set_category_id,set_payee_id,set_status,priority,created_at"
      )
      .eq("workspace_id", workspaceId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<ImportRuleQueryRow[]>()
  ]);

  if (!accountResult.data) {
    redirect("/imports?error=Conta inválida para a importação.");
  }

  if (importRulesResult.error && importRulesResult.error.code !== "42P01") {
    redirect(`/imports?error=${encodeURIComponent(importRulesResult.error.message)}`);
  }

  if (transactionsResult.error) {
    if (transactionsResult.error.code === "42703") {
      redirect(
        "/imports?error=Execute%20a%20migration%200011_import_traceability.sql%20antes%20de%20importar%20extratos."
      );
    }

    redirect(`/imports?error=${encodeURIComponent(transactionsResult.error.message)}`);
  }

  const importSourceType = detectImportSourceType(content);
  const parsedRows = parseImportStatement(content).filter((row) => row.amount !== 0);

  if (!parsedRows.length) {
    redirect(
      "/imports?error=Não encontramos linhas válidas. Use CSV com data, descrição e valor ou QIF exportado do sistema anterior."
    );
  }

  const categories = (categoriesResult.data ?? []).map((category) => ({
    id: category.id,
    kind: category.kind,
    name: category.name,
    parentId: category.parent_id ?? undefined
  }));
  const importRules = (importRulesResult.data ?? []).map(mapImportRule);
  const payees = [...(payeesResult.data ?? [])];
  const existingTransactions = (transactionsResult.data ?? []).map((transaction) => ({
    accountId: transaction.account_id,
    amount: Number(transaction.amount),
    date: transaction.occurred_on,
    description: transaction.description,
    importSignature: transaction.import_signature
  }));
  const existingSignatures = new Set(
    existingTransactions.map((transaction) =>
      transaction.importSignature ??
      buildTransactionSignature({
        accountId: transaction.accountId,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description
      })
    )
  );
  const fileSignatures = new Set<string>();
  const missingPayees = new Set<string>();
  let duplicated = 0;
  let matchedByRule = 0;

  for (const row of parsedRows) {
    const signature = buildTransactionSignature({
      accountId,
      amount: row.amount,
      date: row.date,
      description: row.description
    });

    const duplicateMatch = findImportDuplicate({
      accountId,
      row,
      signature,
      transactions: existingTransactions
    });

    if (
      fileSignatures.has(signature) ||
      (duplicateMatch && shouldSkipDuplicate(duplicateMatch.reason, duplicateStrategy))
    ) {
      duplicated += 1;
      continue;
    }

    fileSignatures.add(signature);

    if (
      autoCreatePayees &&
      row.payeeName &&
      !findPayeeIdByName(payees, row.payeeName)
    ) {
      missingPayees.add(row.payeeName);
    }
  }

  let createdPayees = 0;

  if (missingPayees.size) {
    const payeeInsertRows = [...missingPayees].map((name) => ({
      workspace_id: workspaceId,
      name,
      notes: null,
      type: "company" as const
    }));
    const { data: createdRows, error: payeeInsertError } = await supabase
      .from("payees")
      .insert(payeeInsertRows)
      .select("id,name,type")
      .returns<PayeeRow[]>();

    if (payeeInsertError) {
      redirect(`/imports?error=${encodeURIComponent(payeeInsertError.message)}`);
    }

    createdPayees = createdRows?.length ?? 0;
    payees.push(...(createdRows ?? []));
  }

  const rowsToInsert = [];

  for (const row of parsedRows) {
    const signature = buildTransactionSignature({
      accountId,
      amount: row.amount,
      date: row.date,
      description: row.description
    });

    const duplicateMatch = findImportDuplicate({
      accountId,
      row,
      signature,
      transactions: existingTransactions
    });

    if (
      existingSignatures.has(signature) ||
      (duplicateMatch && shouldSkipDuplicate(duplicateMatch.reason, duplicateStrategy))
    ) {
      continue;
    }

    existingSignatures.add(signature);

    const defaultCategoryId = matchCategoryId({
      categories,
      categoryName: row.categoryName,
      subcategoryName: row.subcategoryName
    });
    const defaultPayeeId = findPayeeIdByName(payees, row.payeeName);
    const ruleResult = applyImportRule({
      accountId,
      defaultCategoryId,
      defaultPayeeId,
      defaultStatus: status,
      row,
      rules: importRules
    });

    if (ruleResult.matchedRuleName) {
      matchedByRule += 1;
    }

    rowsToInsert.push({
      workspace_id: workspaceId,
      account_id: accountId,
      transfer_account_id: null,
      category_id: ruleResult.categoryId,
      payee_id: ruleResult.payeeId,
      description: row.description,
      amount: row.amount,
      currency: accountResult.data.currency,
      occurred_on: row.date,
      status: ruleResult.status,
      source: "imported" as const,
      import_signature: signature,
      import_rule_id: ruleResult.matchedRuleId
    });
  }

  if (!rowsToInsert.length) {
    redirect(
      "/imports?error=Tudo o que veio no arquivo já existe nessa conta. Nada novo para importar."
    );
  }

  let summary = buildImportSummary({
    createdPayees,
    duplicatéd: duplicated,
    imported: rowsToInsert.length,
    parsed: parsedRows.length
  });

  if (matchedByRule > 0) {
    summary += ` ${matchedByRule} movimento(s) recebeu(ram) regra automática.`;
  }

  const originalFilename = file instanceof File && file.name ? file.name : null;
  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      workspace_id: workspaceId,
      account_id: accountId,
      source_type: importSourceType,
      original_filename: originalFilename,
      row_count: parsedRows.length,
      imported_count: rowsToInsert.length,
      duplicate_count: duplicated,
      rule_match_count: matchedByRule,
      status: "completed",
      summary
    })
    .select("id")
    .single<ImportBatchInsertRow>();

  if (batchError || !batch) {
    if (batchError?.code === "42P01" || batchError?.code === "42703") {
      redirect(
        "/imports?error=Execute%20a%20migration%200011_import_traceability.sql%20antes%20de%20importar%20extratos."
      );
    }

    redirect(
      `/imports?error=${encodeURIComponent(
        batchError?.message ?? "Nao foi possivel registrar o lote de importacao."
      )}`
    );
  }

  const { error: insertError } = await supabase
    .from("transactions")
    .insert(rowsToInsert.map((row) => ({ ...row, import_batch_id: batch.id })));

  if (insertError) {
    await supabase
      .from("import_batches")
      .update({
        status: "failed",
        summary: insertError.message
      })
      .eq("id", batch.id)
      .eq("workspace_id", workspaceId);

    if (insertError.code === "23505") {
      redirect(
        "/imports?error=Este%20arquivo%20tem%20movimentos%20ja%20importados%20para%20essa%20conta.%20Revise%20o%20lote%20e%20tente%20novamente."
      );
    }

    redirect(`/imports?error=${encodeURIComponent(insertError.message)}`);
  }

  redirect(`/imports?success=${encodeURIComponent(summary)}`);
}

export async function postImportedTransactions(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const transactionIds = parseSelectedIds(formData.getAll("transactionIds"));

  if (!transactionIds.length) {
    redirect("/imports?error=Selecione ao menos um movimento importado para conciliar.");
  }

  const { data: transactions, error: fetchError } = await supabase
    .from("transactions")
    .select("id,status,description,amount,occurred_on,import_batch_id,import_rule_id,import_signature")
    .eq("workspace_id", workspaceId)
    .eq("source", "imported")
    .in("id", transactionIds)
    .returns<ImportedTransactionAuditRow[]>();

  if (fetchError) {
    if (fetchError.code === "42703") {
      redirect(
        "/imports?error=Execute%20a%20migration%200012_transaction_audit_events.sql%20antes%20de%20conciliar%20importados."
      );
    }

    redirect(`/imports?error=${encodeURIComponent(fetchError.message)}`);
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      status: "posted",
      reconciled_at: new Date().toISOString(),
      reconciled_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq("workspace_id", workspaceId)
    .eq("source", "imported")
    .in("id", transactionIds);

  if (error) {
    if (error.code === "42703") {
      redirect(
        "/imports?error=Execute%20a%20migration%200012_transaction_audit_events.sql%20antes%20de%20conciliar%20importados."
      );
    }

    redirect(`/imports?error=${encodeURIComponent(error.message)}`);
  }

  const auditRows = (transactions ?? []).map((transaction) => ({
    workspace_id: workspaceId,
    transaction_id: transaction.id,
    actor_id: user.id,
    event_type: "imported_posted",
    source: "imports",
    before_status: transaction.status,
    after_status: "posted",
    note: "Movimento importado conciliado pelo usuário.",
    metadata: {
      amount: transaction.amount,
      description: transaction.description,
      import_batch_id: transaction.import_batch_id,
      import_rule_id: transaction.import_rule_id,
      import_signature: transaction.import_signature,
      occurred_on: transaction.occurred_on
    }
  }));

  if (auditRows.length) {
    const { error: auditError } = await supabase
      .from("transaction_audit_events")
      .insert(auditRows);

    if (auditError) {
      if (auditError.code === "42P01" || auditError.code === "42703") {
        redirect(
          "/imports?error=Movimentos%20conciliados,%20mas%20a%20auditoria%20precisa%20da%20migration%200012_transaction_audit_events.sql."
        );
      }

      redirect(`/imports?error=${encodeURIComponent(auditError.message)}`);
    }
  }

  redirect(`/imports?success=${encodeURIComponent(`${transactionIds.length} movimento(s) conciliado(s).`)}`);
}

export async function deleteImportedTransactions(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const transactionIds = parseSelectedIds(formData.getAll("transactionIds"));

  if (!transactionIds.length) {
    redirect("/imports?error=Selecione ao menos um movimento importado para remover.");
  }

  const { error: auditPreflightError } = await supabase
    .from("transaction_audit_events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1);

  if (auditPreflightError) {
    if (auditPreflightError.code === "42P01" || auditPreflightError.code === "42703") {
      redirect(
        "/imports?error=Execute%20a%20migration%200012_transaction_audit_events.sql%20antes%20de%20remover%20importados."
      );
    }

    redirect(`/imports?error=${encodeURIComponent(auditPreflightError.message)}`);
  }

  const { data: transactions, error: fetchError } = await supabase
    .from("transactions")
    .select("id,status,description,amount,occurred_on,import_batch_id,import_rule_id,import_signature")
    .eq("workspace_id", workspaceId)
    .eq("source", "imported")
    .in("id", transactionIds)
    .returns<ImportedTransactionAuditRow[]>();

  if (fetchError) {
    redirect(`/imports?error=${encodeURIComponent(fetchError.message)}`);
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("source", "imported")
    .in("id", transactionIds);

  if (error) {
    redirect(`/imports?error=${encodeURIComponent(error.message)}`);
  }

  const auditRows = (transactions ?? []).map((transaction) => ({
    workspace_id: workspaceId,
    transaction_id: null,
    actor_id: user.id,
    event_type: "imported_deleted",
    source: "imports",
    before_status: transaction.status,
    after_status: null,
    note: "Movimento importado removido pelo usuário antes da conciliação final.",
    metadata: {
      amount: transaction.amount,
      description: transaction.description,
      import_batch_id: transaction.import_batch_id,
      import_rule_id: transaction.import_rule_id,
      import_signature: transaction.import_signature,
      occurred_on: transaction.occurred_on,
      removed_transaction_id: transaction.id
    }
  }));

  if (auditRows.length) {
    const { error: auditError } = await supabase
      .from("transaction_audit_events")
      .insert(auditRows);

    if (auditError) {
      redirect(`/imports?error=${encodeURIComponent(auditError.message)}`);
    }
  }

  redirect(`/imports?success=${encodeURIComponent(`${transactionIds.length} movimento(s) removido(s).`)}`);
}

export async function cancelLatestImportBatch(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const batchId = String(formData.get("batchId") ?? "").trim();

  if (!batchId) {
    redirect("/imports?error=Lote de importacao invalido para cancelamento.");
  }

  const { data: latestBatch, error: latestBatchError } = await supabase
    .from("import_batches")
    .select("id,status,original_filename")
    .eq("workspace_id", workspaceId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; original_filename: string | null; status: string }>();

  if (latestBatchError) {
    if (latestBatchError.code === "42703" || latestBatchError.code === "42P01") {
      redirect(
        "/imports?error=Execute%20a%20migration%200037_cancel_import_batches.sql%20antes%20de%20cancelar%20importacoes."
      );
    }

    redirect(`/imports?error=${encodeURIComponent(latestBatchError.message)}`);
  }

  if (!latestBatch || latestBatch.id !== batchId) {
    redirect("/imports?error=Somente a ultima importacao ativa pode ser cancelada.");
  }

  const { data: transactions, error: fetchError } = await supabase
    .from("transactions")
    .select("id,status,description,amount,occurred_on,import_batch_id,import_rule_id,import_signature")
    .eq("workspace_id", workspaceId)
    .eq("source", "imported")
    .eq("import_batch_id", batchId)
    .returns<ImportedTransactionAuditRow[]>();

  if (fetchError) {
    redirect(`/imports?error=${encodeURIComponent(fetchError.message)}`);
  }

  if (!transactions?.length) {
    const { error: batchUpdateError } = await supabase
      .from("import_batches")
      .update({
        status: "cancelled",
        summary: "Importacao cancelada. Nenhum movimento ativo foi encontrado para remover."
      })
      .eq("id", batchId)
      .eq("workspace_id", workspaceId);

    if (batchUpdateError) {
      redirect(`/imports?error=${encodeURIComponent(batchUpdateError.message)}`);
    }

    redirect("/imports?success=Ultima importacao marcada como cancelada.");
  }

  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("source", "imported")
    .eq("import_batch_id", batchId);

  if (deleteError) {
    redirect(`/imports?error=${encodeURIComponent(deleteError.message)}`);
  }

  const auditRows = transactions.map((transaction) => ({
    workspace_id: workspaceId,
    transaction_id: null,
    actor_id: user.id,
    event_type: "imported_deleted",
    source: "imports",
    before_status: transaction.status,
    after_status: null,
    note: "Movimento removido pelo cancelamento da ultima importacao.",
    metadata: {
      amount: transaction.amount,
      description: transaction.description,
      import_batch_id: transaction.import_batch_id,
      import_rule_id: transaction.import_rule_id,
      import_signature: transaction.import_signature,
      occurred_on: transaction.occurred_on,
      removed_transaction_id: transaction.id
    }
  }));

  if (auditRows.length) {
    const { error: auditError } = await supabase
      .from("transaction_audit_events")
      .insert(auditRows);

    if (auditError) {
      redirect(`/imports?error=${encodeURIComponent(auditError.message)}`);
    }
  }

  const { error: batchUpdateError } = await supabase
    .from("import_batches")
    .update({
      status: "cancelled",
      summary: `${transactions.length} movimento(s) removido(s) no cancelamento desta importacao.`
    })
    .eq("id", batchId)
    .eq("workspace_id", workspaceId);

  if (batchUpdateError) {
    redirect(`/imports?error=${encodeURIComponent(batchUpdateError.message)}`);
  }

  redirect(
    `/imports?success=${encodeURIComponent(
      `${transactions.length} movimento(s) da ultima importacao foram estornados.`
    )}`
  );
}

function parseSelectedIds(rawValues: FormDataEntryValue[]) {
  const values = rawValues
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return [...new Set(values)];
}

export async function createImportRule(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const name = String(formData.get("name") ?? "").trim();
  const pattern = String(formData.get("pattern") ?? "").trim();
  const priority = parsePriority(formData.get("priority"));

  if (!name || !pattern) {
    redirect("/imports?error=Informe nome e padrao da regra.");
  }

  const { error } = await supabase.from("import_rules").insert({
    workspace_id: workspaceId,
    name,
    is_active: true,
    match_field: normalizeImportRuleMatchField(formData.get("matchField")),
    match_type: normalizeImportRuleMatchType(formData.get("matchType")),
    pattern,
    scope_account_id: normalizeOptionalId(formData.get("scopeAccountId")),
    set_category_id: normalizeOptionalId(formData.get("setCategoryId")),
    set_payee_id: normalizeOptionalId(formData.get("setPayeeId")),
    set_status: normalizeImportRuleStatus(formData.get("setStatus")),
    priority
  });

  if (error) {
    if (error.code === "42P01") {
      redirect(
        "/imports?error=Ative%20a%20migration%200005_import_rules.sql%20antes%20de%20criar%20regras."
      );
    }

    redirect(`/imports?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/imports?success=Regra de importação criada.");
}

export async function updateImportRule(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const ruleId = String(formData.get("ruleId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const pattern = String(formData.get("pattern") ?? "").trim();
  const priority = parsePriority(formData.get("priority"));

  if (!ruleId || !name || !pattern) {
    redirect("/imports?error=Preencha a regra antes de salvar.");
  }

  const { error } = await supabase
    .from("import_rules")
    .update({
      name,
      is_active: String(formData.get("isActive") ?? "") === "on",
      match_field: normalizeImportRuleMatchField(formData.get("matchField")),
      match_type: normalizeImportRuleMatchType(formData.get("matchType")),
      pattern,
      scope_account_id: normalizeOptionalId(formData.get("scopeAccountId")),
      set_category_id: normalizeOptionalId(formData.get("setCategoryId")),
      set_payee_id: normalizeOptionalId(formData.get("setPayeeId")),
      set_status: normalizeImportRuleStatus(formData.get("setStatus")),
      priority,
      updated_at: new Date().toISOString()
    })
    .eq("id", ruleId)
    .eq("workspace_id", workspaceId);

  if (error) {
    if (error.code === "42P01") {
      redirect(
        "/imports?error=Ative%20a%20migration%200005_import_rules.sql%20antes%20de%20editar%20regras."
      );
    }

    redirect(`/imports?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/imports?success=Regra de importação atualizada.");
}

export async function deleteImportRule(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const ruleId = String(formData.get("ruleId") ?? "").trim();

  if (!ruleId) {
    redirect("/imports?error=Regra inválida para exclusão.");
  }

  const { error } = await supabase
    .from("import_rules")
    .delete()
    .eq("id", ruleId)
    .eq("workspace_id", workspaceId);

  if (error) {
    if (error.code === "42P01") {
      redirect(
        "/imports?error=Ative%20a%20migration%200005_import_rules.sql%20antes%20de%20remover%20regras."
      );
    }

    redirect(`/imports?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/imports?success=Regra de importação removida.");
}

function parsePriority(value: FormDataEntryValue | null) {
  const parsed = Number.parseInt(String(value ?? "100"), 10);
  if (!Number.isFinite(parsed)) {
    return 100;
  }

  return Math.max(0, Math.min(999, parsed));
}

function normalizeOptionalId(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text && text !== "none" ? text : null;
}

function normalizeDuplicateStrategy(value: FormDataEntryValue | null) {
  return String(value ?? "") === "import_probable" ? "import_probable" : "skip_probable";
}

function shouldSkipDuplicate(
  reason: "signature" | "same_day_amount_description",
  strategy: "skip_probable" | "import_probable"
) {
  return reason === "signature" || strategy === "skip_probable";
}
