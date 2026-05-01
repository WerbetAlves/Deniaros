"use server";

import { redirect } from "next/navigation";
import { normalizeCategoryKind } from "@/lib/finance-admin";
import { money99CategoryTree, type Money99CategoryNode } from "@/lib/money99-categories";
import { getWorkspaceContext } from "@/lib/workspace-context";

export async function createCategory(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const name = String(formData.get("name") ?? "").trim();
  const kind = normalizeCategoryKind(formData.get("kind"));

  if (!name) {
    redirect("/categories?error=Informe o nome da categoria.");
  }

  const parentId = await resolveParentId({
    supabase,
    workspaceId,
    itemId: null,
    parentId: formData.get("parentId"),
    kind
  });

  const { error } = await supabase.from("categories").insert({
    workspace_id: workspaceId,
    parent_id: parentId,
    name,
    kind
  });

  if (error) {
    redirect(`/categories?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/categories?success=Categoria criada.");
}

export async function updateCategory(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const kind = normalizeCategoryKind(formData.get("kind"));

  if (!itemId || !name) {
    redirect("/categories?error=Preencha o registro antes de salvar.");
  }

  const parentId = await resolveParentId({
    supabase,
    workspaceId,
    itemId,
    parentId: formData.get("parentId"),
    kind
  });

  const { error } = await supabase
    .from("categories")
    .update({
      parent_id: parentId,
      name,
      kind
    })
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`/categories?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/categories?success=Categoria atualizada.");
}

export async function deleteCategory(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");

  if (!itemId) {
    redirect("/categories?error=Categoria inválida para exclusão.");
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`/categories?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/categories?success=Categoria removida.");
}

export async function installMoney99Categories() {
  const { supabase, workspaceId } = await getWorkspaceContext();
  let created = 0;

  for (const section of money99CategoryTree) {
    for (const node of section.nodes) {
      const parent = await ensureCategory({
        supabase,
        workspaceId,
        kind: section.kind,
        node,
        parentId: null
      });

      if (parent.created) {
        created += 1;
      }

      for (const child of node.children ?? []) {
        const result = await ensureCategory({
          supabase,
          workspaceId,
          kind: section.kind,
          node: child,
          parentId: parent.id
        });

        if (result.created) {
          created += 1;
        }
      }
    }
  }

  const message = created
    ? `Estrutura clássica instalada com ${created} novas categorias.`
    : "Estrutura clássica já estava instalada.";

  redirect(`/categories?success=${encodeURIComponent(message)}`);
}

async function resolveParentId({
  supabase,
  workspaceId,
  itemId,
  parentId,
  kind
}: {
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"];
  workspaceId: string;
  itemId: string | null;
  parentId: FormDataEntryValue | null;
  kind: "income" | "expense";
}) {
  const parent = String(parentId ?? "").trim();

  if (!parent) {
    return null;
  }

  if (itemId && parent === itemId) {
    redirect("/categories?error=Uma categoria não pode ser pai de si mêsma.");
  }

  const { data, error } = await supabase
    .from("categories")
    .select("id,kind,parent_id")
    .eq("id", parent)
    .eq("workspace_id", workspaceId)
    .maybeSingle<{ id: string; kind: "income" | "expense"; parent_id: string | null }>();

  if (error || !data) {
    redirect("/categories?error=Categoria principal inválida.");
  }

  if (data.kind !== kind) {
    redirect("/categories?error=A subcategoria precisa ter o mêsmo tipo da categoria principal.");
  }

  if (data.parent_id) {
    redirect("/categories?error=Escolha uma categoria principal, não uma subcategoria.");
  }

  return data.id;
}

async function ensureCategory({
  supabase,
  workspaceId,
  kind,
  node,
  parentId
}: {
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"];
  workspaceId: string;
  kind: "income" | "expense";
  node: Money99CategoryNode | NonNullable<Money99CategoryNode["children"]>[number];
  parentId: string | null;
}) {
  const matchQuery = supabase
    .from("categories")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", node.name)
    .eq("kind", kind);

  const { data: exactMatch } = await (parentId
    ? matchQuery.eq("parent_id", parentId)
    : matchQuery.is("parent_id", null)
  ).maybeSingle<{ id: string }>();

  if (exactMatch) {
    return { id: exactMatch.id, created: false };
  }

  const { data: inserted, error } = await supabase
    .from("categories")
    .insert({
      workspace_id: workspaceId,
      parent_id: parentId,
      name: node.name,
      kind
    })
    .select("id")
    .single<{ id: string }>();

  if (inserted && !error) {
    return { id: inserted.id, created: true };
  }

  const { data: fallback } = await supabase
    .from("categories")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", node.name)
    .eq("kind", kind)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (fallback) {
    return { id: fallback.id, created: false };
  }

  redirect(
    `/categories?error=${encodeURIComponent(
      error?.message ?? "Não foi possível instalar a categoria."
    )}`
  );
}
