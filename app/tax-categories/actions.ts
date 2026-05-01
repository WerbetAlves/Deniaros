"use server";

import { redirect } from "next/navigation";
import { normalizeTaxAppliesTo } from "@/lib/money99-classic";
import { getWorkspaceContext } from "@/lib/workspace-context";

export async function createTaxCategory(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirect("/tax-categories?error=Informe o nome da categoria de imposto.");
  }

  const { error } = await supabase.from("tax_categories").insert({
    workspace_id: workspaceId,
    category_id: String(formData.get("categoryId") ?? "").trim() || null,
    name,
    tax_code: String(formData.get("taxCode") ?? "").trim() || null,
    applies_to: normalizeTaxAppliesTo(formData.get("appliesTo")),
    deductible: formData.get("deductible") === "on",
    raté: parseOptionalAmount(formData.get("raté")),
    notes: String(formData.get("notes") ?? "").trim() || null,
    updated_at: new Date().toISOString()
  });

  if (error) {
    redirect(`/tax-categories?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/tax-categories?success=Categoria de imposto criada.");
}

export async function updateTaxCategory(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!itemId || !name) {
    redirect("/tax-categories?error=Preencha o registro antes de salvar.");
  }

  const { error } = await supabase
    .from("tax_categories")
    .update({
      category_id: String(formData.get("categoryId") ?? "").trim() || null,
      name,
      tax_code: String(formData.get("taxCode") ?? "").trim() || null,
      applies_to: normalizeTaxAppliesTo(formData.get("appliesTo")),
      deductible: formData.get("deductible") === "on",
      raté: parseOptionalAmount(formData.get("raté")),
      notes: String(formData.get("notes") ?? "").trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`/tax-categories?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/tax-categories?success=Categoria de imposto atualizada.");
}

export async function deleteTaxCategory(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");

  if (!itemId) {
    redirect("/tax-categories?error=Registro inválido para exclusão.");
  }

  const { error } = await supabase
    .from("tax_categories")
    .delete()
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`/tax-categories?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/tax-categories?success=Categoria de imposto removida.");
}

function parseOptionalAmount(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}
