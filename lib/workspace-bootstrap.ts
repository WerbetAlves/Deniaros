import type { SupabaseClient, User } from "@supabase/supabase-js";

type WorkspaceRecord = {
  id: string;
};

type CategoryRecord = {
  id: string;
};

const defaultPayees = [
  { name: "Mercado da semana", type: "place" },
  { name: "Conta de energia", type: "company" },
  { name: "Internet residencial", type: "company" },
  { name: "Cliente principal", type: "company" }
] satisfies Array<{
  name: string;
  type: "person" | "company" | "place";
}>;

const defaultCategoryTree = [
  {
    name: "Renda",
    kind: "income",
    children: ["Pro-labore", "Vendas", "Outros rendimentos"]
  },
  {
    name: "Alimentação",
    kind: "expense",
    children: ["Mercado", "Restaurantes", "Delivery"]
  },
  {
    name: "Transporte",
    kind: "expense",
    children: ["Combustível", "Transporte publico", "Manutenção"]
  },
  {
    name: "Moradia",
    kind: "expense",
    children: ["Aluguel", "Energia", "Internet"]
  },
  {
    name: "Reserva",
    kind: "expense",
    children: ["Reserva financeira", "Investimentos"]
  }
] satisfies Array<{
  name: string;
  kind: "income" | "expense";
  children: string[];
}>;

export async function ensureDefaultWorkspace(
  supabase: SupabaseClient,
  user: User
) {
  const sharedWorkspaceId = await getPrimarySharedWorkspaceId(supabase, user.id);

  if (sharedWorkspaceId) {
    return sharedWorkspaceId;
  }

  const { data: existingWorkspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle<WorkspaceRecord>();

  if (existingWorkspace) {
    const [categoryProbe, payeeProbe] = await Promise.all([
      supabase
        .from("categories")
        .select("id")
        .eq("workspace_id", existingWorkspace.id)
        .limit(1)
        .maybeSingle<{ id: string }>(),
      supabase
        .from("payees")
        .select("id")
        .eq("workspace_id", existingWorkspace.id)
        .limit(1)
        .maybeSingle<{ id: string }>()
    ]);

    if (!categoryProbe.data) {
      await ensureDefaultCategories(supabase, existingWorkspace.id);
    }

    if (!payeeProbe.data) {
      await ensureDefaultPayees(supabase, existingWorkspace.id);
    }

    return existingWorkspace.id;
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({
      owner_id: user.id,
      name: "Meu Deniaros",
      type: "personal",
      base_currency: "BRL",
      locale: "pt-BR",
      time_zone: "America/Fortaleza",
      country_code: "BR"
    })
    .select("id")
    .single<WorkspaceRecord>();

  if (error || !workspace) {
    throw error ?? new Error("Could not create default workspace.");
  }

  await seedDefaultWorkspaceData(supabase, workspace.id);

  return workspace.id;
}

async function getPrimarySharedWorkspaceId(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("is_primary", true)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ workspace_id: string }>();

  if (error) {
    return null;
  }

  return data?.workspace_id ?? null;
}

async function seedDefaultWorkspaceData(
  supabase: SupabaseClient,
  workspaceId: string
) {
  const { data: accounts } = await supabase
    .from("accounts")
    .insert([
      {
        workspace_id: workspaceId,
        name: "Carteira física",
        type: "cash",
        currency: "BRL",
        opening_balance: 0,
        color: "emerald"
      },
      {
        workspace_id: workspaceId,
        name: "Conta principal",
        type: "checking",
        currency: "BRL",
        opening_balance: 0,
        color: "blue"
      }
    ])
    .select("id,name");

  await ensureDefaultCategories(supabase, workspaceId);
  await ensureDefaultPayees(supabase, workspaceId);

  const primaryAccount = accounts?.[0];

  if (!primaryAccount) {
    return;
  }

  await supabase.from("scheduled_items").insert({
    workspace_id: workspaceId,
    account_id: primaryAccount.id,
    kind: "deposit",
    title: "Primeiro depósito previsto",
    amount: 0,
    currency: "BRL",
    due_on: new Date().toISOString().slice(0, 10),
    recurrence: "once",
    status: "scheduled"
  });
}

async function ensureDefaultPayees(
  supabase: SupabaseClient,
  workspaceId: string
) {
  for (const payee of defaultPayees) {
    const { data: existingPayee } = await supabase
      .from("payees")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("name", payee.name)
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (existingPayee) {
      continue;
    }

    const { error } = await supabase.from("payees").insert({
      workspace_id: workspaceId,
      name: payee.name,
      type: payee.type
    });

    if (error) {
      throw error;
    }
  }
}

async function ensureDefaultCategories(
  supabase: SupabaseClient,
  workspaceId: string
) {
  for (const category of defaultCategoryTree) {
    const parentId = await ensureCategory(supabase, {
      workspaceId,
      name: category.name,
      kind: category.kind
    });

    for (const childName of category.children) {
      await ensureCategory(supabase, {
        workspaceId,
        name: childName,
        kind: category.kind,
        parentId
      });
    }
  }
}

async function ensureCategory(
  supabase: SupabaseClient,
  {
    kind,
    name,
    parentId,
    workspaceId
  }: {
    workspaceId: string;
    name: string;
    kind: "income" | "expense";
    parentId?: string;
  }
) {
  const { data: existingCategory } = await supabase
    .from("categories")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", name)
    .eq("kind", kind)
    .limit(1)
    .maybeSingle<CategoryRecord>();

  if (existingCategory) {
    return existingCategory.id;
  }

  const { data: category, error } = await supabase
    .from("categories")
    .insert({
      workspace_id: workspaceId,
      name,
      kind,
      parent_id: parentId ?? null
    })
    .select("id")
    .single<CategoryRecord>();

  if (error || !category) {
    throw error ?? new Error(`Could not create category ${name}.`);
  }

  return category.id;
}
