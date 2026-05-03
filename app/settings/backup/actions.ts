"use server";

import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace-context";

const backupPath = "/settings/backup";
const maxBackupFileSize = 15 * 1024 * 1024;

type RestoreResult = {
  totalRestored?: number;
  restoredCounts?: Record<string, number>;
};

type DeleteSystemDataResult = {
  deletedCounts?: Record<string, number>;
  totalDeleted?: number;
};

export async function restoreWorkspaceBackup(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  const fileEntry = formData.get("backupFile");

  if (confirmation !== "RESTAURAR") {
    redirect(
      `${backupPath}?restore_error=${encodeURIComponent(
        'Digite "RESTAURAR" para confirmar a substituição dos dados atuais.'
      )}`
    );
  }

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    redirect(`${backupPath}?restore_error=${encodeURIComponent("Selecione um arquivo de backup Deniaros.")}`);
  }

  if (fileEntry.size > maxBackupFileSize) {
    redirect(`${backupPath}?restore_error=${encodeURIComponent("O backup ultrapassa o limite de 15 MB.")}`);
  }

  let backupPayload: unknown;

  try {
    backupPayload = JSON.parse(await fileEntry.text());
  } catch {
    redirect(`${backupPath}?restore_error=${encodeURIComponent("Arquivo JSON inválido.")}`);
  }

  const validationError = validateBackupPayload(backupPayload, user.id);

  if (validationError) {
    redirect(`${backupPath}?restore_error=${encodeURIComponent(validationError)}`);
  }

  const { data, error } = await supabase.rpc("restore_workspace_backup", {
    backup_payload: backupPayload,
    target_workspace_id: workspaceId
  });

  if (error) {
    redirect(`${backupPath}?restore_error=${encodeURIComponent(error.message)}`);
  }

  await restoreSystemPreferencesFromBackup(supabase, backupPayload, user.id, workspaceId);

  const restoreResult = data as RestoreResult | null;
  const totalRestored = Number(restoreResult?.totalRestored ?? 0);

  redirect(
    `${backupPath}?restore_success=${encodeURIComponent(
      `Backup restaurado. ${totalRestored} registro(s) foram aplicados ao workspace.`
    )}`
  );
}

export async function deleteWorkspaceSystemData(formData: FormData) {
  const { supabase, workspaceId } = await getWorkspaceContext();
  const primaryConfirmation = String(formData.get("primaryConfirmation") ?? "").trim();
  const backupConfirmation = String(formData.get("backupConfirmation") ?? "").trim();

  if (primaryConfirmation !== "APAGAR DADOS DO SISTEMA") {
    redirect(
      `${backupPath}?delete_error=${encodeURIComponent(
        "Primeira confirmacao invalida. Digite exatamente APAGAR DADOS DO SISTEMA."
      )}`
    );
  }

  if (backupConfirmation !== "CONFIRMO QUE TENHO BACKUP") {
    redirect(
      `${backupPath}?delete_error=${encodeURIComponent(
        "Segunda confirmacao invalida. Baixe um backup e digite exatamente CONFIRMO QUE TENHO BACKUP."
      )}`
    );
  }

  const { data, error } = await supabase.rpc("delete_workspace_system_data", {
    target_workspace_id: workspaceId
  });

  if (error) {
    redirect(`${backupPath}?delete_error=${encodeURIComponent(error.message)}`);
  }

  const result = data as DeleteSystemDataResult | null;
  const totalDeleted = Number(result?.totalDeleted ?? 0);

  redirect(
    `${backupPath}?delete_success=${encodeURIComponent(
      `Dados apagados com seguranca. ${totalDeleted} registro(s) foram removidos e a auditoria foi preservada.`
    )}`
  );
}

function validateBackupPayload(payload: unknown, currentUserId: string) {
  if (!isRecord(payload)) {
    return "Arquivo de backup inválido.";
  }

  if (payload.app !== "Deniaros") {
    return "Este arquivo não é um backup Deniaros.";
  }

  if (payload.exportVersion !== 1) {
    return "Versão de backup não suportada.";
  }

  if (!isRecord(payload.user) || payload.user.id !== currentUserId) {
    return "Este backup pertence a outro usuário.";
  }

  if (!isRecord(payload.workspace)) {
    return "O backup não contém dados de workspace.";
  }

  if (!isRecord(payload.tables)) {
    return "O backup não contém tabelas restauráveis.";
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function restoreSystemPreferencesFromBackup(
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"],
  payload: unknown,
  userId: string,
  workspaceId: string
) {
  if (!isRecord(payload) || !isRecord(payload.tables)) {
    return;
  }

  const preferencesTable = payload.tables.system_preferences;

  if (!isRecord(preferencesTable) || !Array.isArray(preferencesTable.data)) {
    return;
  }

  const [row] = preferencesTable.data;

  if (!isRecord(row)) {
    return;
  }

  const { error } = await supabase.from("system_preferences").upsert(
    {
      auto_categorize_imports: Boolean(row.auto_categorize_imports ?? true),
      budget_risk_alerts_enabled: Boolean(row.budget_risk_alerts_enabled ?? true),
      command_palette_enabled: Boolean(row.command_palette_enabled ?? true),
      compact_numbers: Boolean(row.compact_numbers ?? false),
      date_format: String(row.date_format ?? "dd/MM/yyyy"),
      due_bill_alerts_enabled: Boolean(row.due_bill_alerts_enabled ?? true),
      email_notifications_enabled: Boolean(row.email_notifications_enabled ?? false),
      enter_to_submit: Boolean(row.enter_to_submit ?? false),
      in_app_notifications_enabled: Boolean(row.in_app_notifications_enabled ?? true),
      keyboard_shortcuts_enabled: Boolean(row.keyboard_shortcuts_enabled ?? true),
      language: String(row.language ?? "pt-BR"),
      low_balance_alerts_enabled: Boolean(row.low_balance_alerts_enabled ?? true),
      quick_add_default: String(row.quick_add_default ?? "transaction"),
      updated_at: new Date().toISOString(),
      user_id: userId,
      week_starts_on: String(row.week_starts_on ?? "monday"),
      weekly_digest_enabled: Boolean(row.weekly_digest_enabled ?? false),
      workspace_id: workspaceId
    },
    { onConflict: "user_id,workspace_id" }
  );

  if (error && error.code !== "42P01" && error.code !== "42703") {
    throw error;
  }
}
