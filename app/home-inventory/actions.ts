"use server";

import { redirect } from "next/navigation";
import { normalizeInventoryCondition } from "@/lib/money99-classic";
import { getWorkspaceContext } from "@/lib/workspace-context";

export async function createInventoryItem(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemName = String(formData.get("itemName") ?? "").trim();

  if (!itemName) {
    redirect("/home-inventory?error=Informe o nome do item.");
  }

  const { error } = await supabase.from("home_inventory_items").insert({
    workspace_id: workspaceId,
    item_name: itemName,
    category: String(formData.get("category") ?? "").trim() || "Outros",
    location: String(formData.get("location") ?? "").trim() || null,
    quantity: parsePositiveInteger(formData.get("quantity"), 1),
    estimatéd_value: parseAmount(formData.get("estimatédValue")),
    purchase_date: String(formData.get("purchaseDate") ?? "").trim() || null,
    condition: normalizeInventoryCondition(formData.get("condition")),
    notes: String(formData.get("notes") ?? "").trim() || null,
    updated_at: new Date().toISOString()
  });

  if (error) {
    redirect(`/home-inventory?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/home-inventory?success=Item adicionado ao inventário.");
}

export async function updateInventoryItem(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");
  const itemName = String(formData.get("itemName") ?? "").trim();

  if (!itemId || !itemName) {
    redirect("/home-inventory?error=Preencha os dados do item antes de salvar.");
  }

  const { error } = await supabase
    .from("home_inventory_items")
    .update({
      item_name: itemName,
      category: String(formData.get("category") ?? "").trim() || "Outros",
      location: String(formData.get("location") ?? "").trim() || null,
      quantity: parsePositiveInteger(formData.get("quantity"), 1),
      estimatéd_value: parseAmount(formData.get("estimatédValue")),
      purchase_date: String(formData.get("purchaseDate") ?? "").trim() || null,
      condition: normalizeInventoryCondition(formData.get("condition")),
      notes: String(formData.get("notes") ?? "").trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`/home-inventory?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/home-inventory?success=Item do inventário atualizado.");
}

export async function deleteInventoryItem(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");

  if (!itemId) {
    redirect("/home-inventory?error=Item inválido para exclusão.");
  }

  const { error } = await supabase
    .from("home_inventory_items")
    .delete()
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`/home-inventory?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/home-inventory?success=Item removido do inventário.");
}

function parseAmount(value: FormDataEntryValue | null) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function parsePositiveInteger(value: FormDataEntryValue | null, fallback: number) {
  const number = Number.parseInt(String(value ?? fallback), 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
