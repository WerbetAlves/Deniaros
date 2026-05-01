"use server";

import { redirect } from "next/navigation";
import { mapWorkspacePayee, normalizePayeeType, WorkspacePayeeRow } from "@/lib/finance-admin";
import { getWorkspaceContext } from "@/lib/workspace-context";

export async function createPayee(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirect("/payees?error=Informe o nome do favorecido.");
  }

  const { error } = await supabase.from("payees").insert({
    workspace_id: workspaceId,
    name,
    type: normalizePayeeType(formData.get("type")),
    notes: String(formData.get("notes") ?? "").trim() || null
  });

  if (error) {
    redirect(`/payees?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/payees?success=Favorecido criado.");
}

export async function updatePayee(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!itemId || !name) {
    redirect("/payees?error=Preencha o favorecido antes de salvar.");
  }

  const { error } = await supabase
    .from("payees")
    .update({
      name,
      type: normalizePayeeType(formData.get("type")),
      notes: String(formData.get("notes") ?? "").trim() || null
    })
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`/payees?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/payees?success=Favorecido atualizado.");
}

export async function deletePayee(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const itemId = String(formData.get("itemId") ?? "");

  if (!itemId) {
    redirect("/payees?error=Favorecido inválido para exclusão.");
  }

  const { data: usedTransactions } = await supabase
    .from("transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("payee_id", itemId)
    .limit(1)
    .returns<Array<{ id: string }>>();

  const { data: usedSchedules } = await supabase
    .from("scheduled_items")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("payee_id", itemId)
    .limit(1)
    .returns<Array<{ id: string }>>();

  if ((usedTransactions?.length ?? 0) > 0 || (usedSchedules?.length ?? 0) > 0) {
    redirect(
      "/payees?error=Este favorecido já esta em uso em lançamentos ou agenda. Edite o cadastro em vez de excluir."
    );
  }

  const { data: payeeRow } = await supabase
    .from("payees")
    .select("id,workspace_id,name,type,notes")
    .eq("id", itemId)
    .eq("workspace_id", workspaceId)
    .maybeSingle<WorkspacePayeeRow>();

  const payee = payeeRow ? mapWorkspacePayee(payeeRow) : null;

  if (
    payee &&
    payee.notes === "" &&
    payee.type === "company" &&
    /^mercado da semana|conta de energia|internet residencial|cliente principal$/i.test(payee.name)
  ) {
    redirect(
      "/payees?error=Este favorecido faz parte da base inicial do workspace. Renomeie ou ajuste o cadastro se preferir."
    );
  }

  const { error } = await supabase
    .from("payees")
    .delete()
    .eq("id", itemId)
    .eq("workspace_id", workspaceId);

  if (error) {
    redirect(`/payees?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/payees?success=Favorecido removido.");
}
