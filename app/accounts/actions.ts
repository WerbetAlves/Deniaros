"use server";

import { redirect } from "next/navigation";
import {
  normalizeAccountColor,
  normalizeAccountConnectionMode,
  normalizeAccountGroup,
  normalizeAccountType,
  normalizeCurrency,
  normalizeOpenFinanceStatus
} from "@/lib/finance-admin";
import { getWorkspaceContext } from "@/lib/workspace-context";

type AccountBalanceCheckAccountRow = {
  id: string;
  opening_balance: number | string | null;
};

type AccountBalanceCheckTransactionRow = {
  account_id: string;
  amount: number | string | null;
  reconciled_at: string | null;
  status: "pending" | "posted";
  transfer_account_id: string | null;
};

export async function createAccount(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const name = String(formData.get("name") ?? "").trim();
  const defaultCurrency = String(formData.get("defaultCurrency") ?? "BRL");
  const connectionMode = normalizeAccountConnectionMode(formData.get("connectionMode"));
  const openFinanceProvider = normalizeOptionalText(formData.get("openFinanceProvider"));
  const openFinanceStatus = resolveOpenFinanceStatus(formData, connectionMode);
  const externalAccountRef = normalizeOptionalText(formData.get("externalAccountRef"));
  const accountType = normalizeAccountType(formData.get("type"));
  const openingBalanceDate = normalizeDateInput(formData.get("openingBalanceDate"));

  if (!name) {
    redirect("/accounts?error=Informe o nome da conta.");
  }

  const accountPayload = {
    workspace_id: workspaceId,
    name,
    type: accountType,
    currency: normalizeCurrency(formData.get("currency"), defaultCurrency),
    opening_balance: parseAmount(formData.get("openingBalance")),
    opening_balance_date: openingBalanceDate,
    color: normalizeAccountColor(formData.get("color")),
    account_group: normalizeAccountGroup(formData.get("accountGroup"), accountType),
    connection_mode: connectionMode,
    openfinance_provider: openFinanceProvider,
    openfinance_status: openFinanceStatus,
    external_account_ref: externalAccountRef,
    is_favorite: parseCheckbox(formData.get("isFavorite")),
    is_active: true,
    updated_at: new Date().toISOString()
  };

  let { error } = await supabase.from("accounts").insert(accountPayload);

  if (isMissingOpeningBalanceDateColumn(error)) {
    const { error: retryError } = await supabase
      .from("accounts")
      .insert(omitOpeningBalanceDate(accountPayload));
    error = retryError;
  }

  if (error) {
    if (error.code === "42703") {
      redirect(
        "/accounts?error=Ative%20as%20migrations%200006_account_openfinance.sql%2C%200023_money99_account_structure.sql%20e%200038_account_opening_balance_date.sql%20para%20usar%20a%20estrutura%20completa%20de%20contas."
      );
    }

    redirect(`/accounts?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/accounts?success=Carteira criada.");
}

export async function updateAccount(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const defaultCurrency = String(formData.get("defaultCurrency") ?? "BRL");
  const connectionMode = normalizeAccountConnectionMode(formData.get("connectionMode"));
  const openFinanceProvider = normalizeOptionalText(formData.get("openFinanceProvider"));
  const openFinanceStatus = resolveOpenFinanceStatus(formData, connectionMode);
  const externalAccountRef = normalizeOptionalText(formData.get("externalAccountRef"));
  const accountType = normalizeAccountType(formData.get("type"));
  const openingBalanceDate = normalizeDateInput(formData.get("openingBalanceDate"));

  if (!itemId || !name) {
    redirect("/accounts?error=Preencha os dados da conta antes de salvar.");
  }

  const accountPayload = {
    name,
    type: accountType,
    currency: normalizeCurrency(formData.get("currency"), defaultCurrency),
    opening_balance: parseAmount(formData.get("openingBalance")),
    opening_balance_date: openingBalanceDate,
    color: normalizeAccountColor(formData.get("color")),
    account_group: normalizeAccountGroup(formData.get("accountGroup"), accountType),
    connection_mode: connectionMode,
    openfinance_provider: openFinanceProvider,
    openfinance_status: openFinanceStatus,
    external_account_ref: externalAccountRef,
    is_favorite: parseCheckbox(formData.get("isFavorite")),
    updated_at: new Date().toISOString()
  };

  let { error } = await supabase
    .from("accounts")
    .update(accountPayload)
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (isMissingOpeningBalanceDateColumn(error)) {
    const { error: retryError } = await supabase
      .from("accounts")
      .update(omitOpeningBalanceDate(accountPayload))
      .eq("id", itemId)
      .eq("workspace_id", workspaceId);
    error = retryError;
  }

  if (error) {
    if (error.code === "42703") {
      redirect(
        "/accounts?error=Ative%20as%20migrations%200006_account_openfinance.sql%2C%200023_money99_account_structure.sql%20e%200038_account_opening_balance_date.sql%20para%20usar%20a%20estrutura%20completa%20de%20contas."
      );
    }

    redirect(`/accounts?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/accounts?success=Carteira atualizada.");
}

export async function archiveAccount(formData: FormData) {
  await updateAccountState(formData, false, "Carteira arquivada.");
}

export async function restoreAccount(formData: FormData) {
  await updateAccountState(formData, true, "Carteira reativada.");
}

export async function createAccountReconciliationCheck(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const accountId = String(formData.get("accountId") ?? "");
  const statementBalance = parseLocalizedAmount(formData.get("statementBalance"));
  const checkedOn = normalizeDateInput(formData.get("checkedOn"));
  const notes = normalizeOptionalText(formData.get("notes"));
  const returnPath = accountId ? `/accounts?accountId=${accountId}` : "/accounts";

  if (!accountId) {
    redirect(withAccountsMessage("/accounts", "error", "Escolha uma conta para conferir o saldo."));
  }

  if (!Number.isFinite(statementBalance)) {
    redirect(withAccountsMessage(returnPath, "error", "Informe o saldo do extrato para comparar."));
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id,opening_balance")
    .eq("id", accountId)
    .eq("workspace_id", workspaceId)
    .single<AccountBalanceCheckAccountRow>();

  if (accountError || !account) {
    redirect(withAccountsMessage(returnPath, "error", "Conta não encontrada para conferência."));
  }

  const { data: transactions, error: transactionsError } = await supabase
    .from("transactions")
    .select("account_id,transfer_account_id,amount,status,reconciled_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "posted")
    .not("reconciled_at", "is", null)
    .or(`account_id.eq.${accountId},transfer_account_id.eq.${accountId}`)
    .returns<AccountBalanceCheckTransactionRow[]>();

  if (transactionsError) {
    if (transactionsError.code === "42703") {
      redirect(
        withAccountsMessage(
          returnPath,
          "error",
          "Execute a migration 0024_transaction_reconciliation_flow.sql para calcular o saldo conferido."
        )
      );
    }

    redirect(withAccountsMessage(returnPath, "error", transactionsError.message));
  }

  const deniarosBalance = (Number(account.opening_balance ?? 0) || 0) + calculateAccountBalanceDelta(
    transactions ?? [],
    accountId
  );
  const difference = statementBalance - deniarosBalance;

  const { error } = await supabase.from("account_reconciliation_checks").insert({
    account_id: accountId,
    checked_on: checkedOn,
    created_by: user.id,
    deniaros_balance: roundMoney(deniarosBalance),
    difference: roundMoney(difference),
    notes,
    statement_balance: roundMoney(statementBalance),
    workspace_id: workspaceId
  });

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      redirect(
        withAccountsMessage(
          returnPath,
          "error",
          "Execute a migration 0025_account_reconciliation_checks.sql para salvar conferências de saldo."
        )
      );
    }

    redirect(withAccountsMessage(returnPath, "error", error.message));
  }

  redirect(withAccountsMessage(returnPath, "success", "Saldo comparado e registrado."));
}

async function updateAccountState(
  formData: FormData,
  isActive: boolean,
  successMessage: string
) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");

  if (!itemId) {
    redirect("/accounts?error=Conta inválida.");
  }

  const { error } = await supabase
    .from("accounts")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`/accounts?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/accounts?success=${encodeURIComponent(successMessage)}`);
}

function parseAmount(value: FormDataEntryValue | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function isMissingOpeningBalanceDateColumn(
  error: { code?: string; details?: string; message?: string } | null
) {
  return /opening_balance_date/i.test(`${error?.code ?? ""} ${error?.message ?? ""} ${error?.details ?? ""}`);
}

function omitOpeningBalanceDate<T extends { opening_balance_date?: string }>(payload: T) {
  const { opening_balance_date: _openingBalanceDate, ...legacyPayload } = payload;
  return legacyPayload;
}

function parseLocalizedAmount(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return Number.NaN;
  }

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  return Number(normalized);
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function parseCheckbox(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function normalizeDateInput(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  return new Date().toISOString().slice(0, 10);
}

function calculateAccountBalanceDelta(
  transactions: AccountBalanceCheckTransactionRow[],
  accountId: string
) {
  return transactions.reduce((total, transaction) => {
    if (transaction.status !== "posted" || !transaction.reconciled_at) {
      return total;
    }

    const amount = Number(transaction.amount ?? 0) || 0;

    if (transaction.transfer_account_id === accountId) {
      return total - amount;
    }

    if (transaction.account_id === accountId) {
      return total + amount;
    }

    return total;
  }, 0);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function withAccountsMessage(path: string, key: "error" | "success", message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(message)}`;
}

function resolveOpenFinanceStatus(
  formData: FormData,
  connectionMode: ReturnType<typeof normalizeAccountConnectionMode>
) {
  if (connectionMode !== "openfinance") {
    return normalizeOpenFinanceStatus("not_connected");
  }

  return normalizeOpenFinanceStatus(formData.get("openFinanceStatus") ?? "pending");
}
