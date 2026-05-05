import type {
  Account,
  Category,
  Payee,
  ScheduledItem,
  Transaction,
  Workspace
} from "@/lib/domain";
import {
  accounts as sampleAccounts,
  categories as sampleCategories,
  payees as samplePayees,
  scheduledItems as sampleScheduledItems,
  transactions as sampleTransactions,
  workspace as sampleWorkspace
} from "@/lib/sample-data";
import { shouldUseSampleFinancialData } from "@/lib/sample-data-policy";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureDefaultWorkspace } from "@/lib/workspace-bootstrap";

type WorkspaceRow = {
  id: string;
  name: string;
  type: Workspace["type"];
  base_currency: string;
  locale: string;
  time_zone: string;
  country_code: string;
};

type AccountRow = {
  id: string;
  name: string;
  type: Account["type"];
  opening_balance: number | string;
  currency: string;
  color: string;
};

type TransactionRow = {
  id: string;
  account_id: string;
  transfer_account_id: string | null;
  category_id: string | null;
  payee_id: string | null;
  description: string;
  amount: number | string;
  currency: string;
  occurred_on: string;
  reconciled_at?: string | null;
  reconciled_by?: string | null;
  status: Transaction["status"];
  source: Transaction["source"];
};

type CategoryRow = {
  id: string;
  name: string;
  kind: Category["kind"];
  parent_id: string | null;
};

type PayeeRow = {
  id: string;
  name: string;
  type: Payee["type"];
};

type ScheduledItemRow = {
  id: string;
  kind: ScheduledItem["kind"];
  account_id: string;
  category_id: string | null;
  payee_id: string | null;
  title: string;
  amount: number | string;
  currency: string;
  due_on: string;
  recurrence: ScheduledItem["recurrence"];
  status: "scheduled" | "due_soon" | "overdue" | "paid";
};

export type FinancialData = {
  workspace: Workspace;
  accounts: Account[];
  categories: Category[];
  payees: Payee[];
  transactions: Transaction[];
  scheduledItems: ScheduledItem[];
  fallbackReason?: string;
  source: "supabase" | "sample" | "unavailable";
};

type FinancialDataOptions = {
  supabase?: SupabaseClient;
  user?: User | null;
  workspaceId?: string;
};

export async function getFinancialData(
  options: FinancialDataOptions = {}
): Promise<FinancialData> {
  try {
    const supabase = options.supabase ?? (await createSupabaseServerClient());
    const user =
      options.user === undefined
        ? (await supabase.auth.getUser()).data.user
        : options.user;

    if (!user) {
      return getFallbackFinancialData(
        "Sessao nao encontrada. Entre novamente para carregar seus dados reais."
      );
    }

    const workspaceId = options.workspaceId ?? (await ensureDefaultWorkspace(supabase, user));

    const { data: workspaceRow, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id,name,type,base_currency,locale,time_zone,country_code")
      .eq("id", workspaceId)
      .maybeSingle<WorkspaceRow>();

    if (workspaceError || !workspaceRow) {
      return getFallbackFinancialData(
        workspaceError?.message ?? "Workspace autenticado nao encontrado.",
        buildFallbackWorkspace(workspaceId)
      );
    }

    const [accountsResult, categoriesResult, payeesResult, transactionsResult, scheduledResult] =
      await Promise.all([
      supabase
        .from("accounts")
        .select("id,name,type,opening_balance,currency,color")
        .eq("workspace_id", workspaceRow.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("categories")
        .select("id,name,kind,parent_id")
        .eq("workspace_id", workspaceRow.id)
        .order("name", { ascending: true }),
      supabase
        .from("payees")
        .select("id,name,type")
        .eq("workspace_id", workspaceRow.id)
        .order("name", { ascending: true }),
      fetchPagedRows<TransactionRow>(() =>
        supabase
          .from("transactions")
          .select(
            "id,account_id,transfer_account_id,category_id,payee_id,description,amount,currency,occurred_on,status,source,reconciled_at,reconciled_by"
          )
          .eq("workspace_id", workspaceRow.id)
          .order("occurred_on", { ascending: false })
      ),
      fetchPagedRows<ScheduledItemRow>(() =>
        supabase
          .from("scheduled_items")
          .select(
            "id,kind,account_id,category_id,payee_id,title,amount,currency,due_on,recurrence,status"
          )
          .eq("workspace_id", workspaceRow.id)
          .order("due_on", { ascending: true })
      )
      ]);

    if (
      accountsResult.error ||
      categoriesResult.error ||
      payeesResult.error ||
      transactionsResult.error ||
      scheduledResult.error
    ) {
      return getFallbackFinancialData(
        [
          accountsResult.error?.message,
          categoriesResult.error?.message,
          payeesResult.error?.message,
          transactionsResult.error?.message,
          scheduledResult.error?.message
        ]
          .filter(Boolean)
          .join(" "),
        mapWorkspace(workspaceRow)
      );
    }

    return {
      workspace: mapWorkspace(workspaceRow),
      accounts: ((accountsResult.data ?? []) as AccountRow[]).map(mapAccount),
      categories: ((categoriesResult.data ?? []) as CategoryRow[]).map(mapCategory),
      payees: ((payeesResult.data ?? []) as PayeeRow[]).map(mapPayee),
      transactions: ((transactionsResult.data ?? []) as TransactionRow[]).map(mapTransaction),
      scheduledItems: ((scheduledResult.data ?? []) as ScheduledItemRow[]).map(mapScheduledItem),
      source: "supabase"
    };
  } catch (error) {
    return getFallbackFinancialData(
      error instanceof Error ? error.message : "Falha inesperada ao carregar dados financeiros."
    );
  }
}

async function fetchPagedRows<T>(
  createQuery: () => {
    range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
  }
) {
  const pageSize = 1000;
  const maxPages = 20;
  const rows: T[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const result = await createQuery().range(from, to);

    if (result.error) {
      return { data: null, error: result.error };
    }

    const pageRows = result.data ?? [];
    rows.push(...pageRows);

    if (pageRows.length < pageSize) {
      break;
    }
  }

  return { data: rows, error: null };
}

function getSampleFinancialData(fallbackReason?: string): FinancialData {
  return {
    workspace: sampleWorkspace,
    accounts: sampleAccounts,
    categories: sampleCategories,
    payees: samplePayees,
    transactions: sampleTransactions,
    scheduledItems: sampleScheduledItems,
    fallbackReason,
    source: "sample"
  };
}

function getFallbackFinancialData(fallbackReason: string, workspace?: Workspace): FinancialData {
  if (shouldUseSampleFinancialData()) {
    return getSampleFinancialData(fallbackReason);
  }

  return {
    workspace: workspace ?? buildFallbackWorkspace(),
    accounts: [],
    categories: [],
    payees: [],
    transactions: [],
    scheduledItems: [],
    fallbackReason,
    source: "unavailable"
  };
}

function buildFallbackWorkspace(id = "workspace-unavailable"): Workspace {
  return {
    id,
    name: "Meu Deniaros",
    type: "personal",
    baseCurrency: "BRL",
    locale: "pt-BR",
    timeZone: "America/Fortaleza",
    countryCode: "BR"
  };
}

function mapWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    baseCurrency: row.base_currency,
    locale: row.locale,
    timeZone: row.time_zone,
    countryCode: row.country_code
  };
}

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    openingBalance: Number(row.opening_balance),
    currency: row.currency,
    color: row.color
  };
}

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    transferAccountId: row.transfer_account_id ?? undefined,
    categoryId: row.category_id ?? undefined,
    payeeId: row.payee_id ?? undefined,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    date: row.occurred_on,
    status: row.status,
    source: row.source,
    reconciledAt: row.reconciled_at ?? undefined,
    reconciledBy: row.reconciled_by ?? undefined
  };
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    parentId: row.parent_id ?? undefined
  };
}

function mapPayee(row: PayeeRow): Payee {
  return {
    id: row.id,
    name: row.name,
    type: row.type
  };
}

function mapScheduledItem(row: ScheduledItemRow): ScheduledItem {
  return {
    id: row.id,
    kind: row.kind,
    accountId: row.account_id,
    categoryId: row.category_id ?? undefined,
    payeeId: row.payee_id ?? undefined,
    title: row.title,
    amount: Number(row.amount),
    currency: row.currency,
    dueDate: row.due_on,
    recurrence: row.recurrence,
    status: row.status === "due_soon" ? "due-soon" : row.status
  };
}
