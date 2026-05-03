"use server";

import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace-context";
import {
  normalizeCurrency,
  normalizeDateFormat,
  normalizeLanguage,
  normalizeQuickAddDefault,
  normalizeWeekStart
} from "@/lib/system-preferences";

export async function updateSystemPreferences(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const language = normalizeLanguage(formData.get("language"));
  const baseCurrency = normalizeCurrency(formData.get("baseCurrency"));
  const dateFormat = normalizeDateFormat(formData.get("dateFormat"));
  const weekStartsOn = normalizeWeekStart(formData.get("weekStartsOn"));
  const quickAddDefault = normalizeQuickAddDefault(formData.get("quickAddDefault"));
  const updatedAt = new Date().toISOString();

  const { error: workspaceError } = await supabase
    .from("workspaces")
    .update({
      base_currency: baseCurrency,
      locale: language,
      updated_at: updatedAt
    })
    .eq("id", workspaceId)
    .eq("owner_id", user.id);

  if (workspaceError) {
    redirect(`/settings/preferences?error=${encodeURIComponent(workspaceError.message)}`);
  }

  const { error } = await supabase.from("system_preferences").upsert(
    {
      auto_categorize_imports: formData.get("autoCategorizeImports") === "on",
      budget_risk_alerts_enabled: formData.get("budgetRiskAlertsEnabled") === "on",
      command_palette_enabled: formData.get("commandPaletteEnabled") === "on",
      compact_numbers: formData.get("compactNumbers") === "on",
      date_format: dateFormat,
      due_bill_alerts_enabled: formData.get("dueBillAlertsEnabled") === "on",
      email_notifications_enabled: formData.get("emailNotificationsEnabled") === "on",
      enter_to_submit: formData.get("enterToSubmit") === "on",
      in_app_notifications_enabled: formData.get("inAppNotificationsEnabled") === "on",
      keyboard_shortcuts_enabled: formData.get("keyboardShortcutsEnabled") === "on",
      language,
      low_balance_alerts_enabled: formData.get("lowBalanceAlertsEnabled") === "on",
      quick_add_default: quickAddDefault,
      updated_at: updatedAt,
      user_id: user.id,
      week_starts_on: weekStartsOn,
      weekly_digest_enabled: formData.get("weeklyDigestEnabled") === "on",
      workspace_id: workspaceId
    },
    { onConflict: "user_id,workspace_id" }
  );

  if (error) {
    redirect(`/settings/preferences?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings/preferences?success=Preferencias do sistema salvas.");
}
