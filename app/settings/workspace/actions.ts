"use server";

import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace-context";
import {
  normalizeCountryCode,
  normalizeTimeZone,
  normalizeWorkspaceName,
  normalizeWorkspaceType
} from "@/lib/workspace-settings";

export async function updateWorkspaceSettings(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const name = normalizeWorkspaceName(formData.get("name"));
  const type = normalizeWorkspaceType(formData.get("type"));
  const countryCode = normalizeCountryCode(formData.get("countryCode"));
  const timeZone = normalizeTimeZone(formData.get("timeZone"));

  if (name.length < 3) {
    redirect("/settings/workspace?error=O nome do arquivo financeiro precisa ter pelo menos 3 caracteres.");
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      country_code: countryCode,
      name,
      time_zone: timeZone,
      type,
      updated_at: new Date().toISOString()
    })
    .eq("id", workspaceId)
    .eq("owner_id", user.id);

  if (error) {
    redirect(`/settings/workspace?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings/workspace?success=Workspace atualizado.");
}
