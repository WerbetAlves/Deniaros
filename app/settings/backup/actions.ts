"use server";

import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace-context";

const backupPath = "/settings/backup";
const maxBackupFileSize = 15 * 1024 * 1024;

type RestoreResult = {
  totalRestored?: number;
  restoredCounts?: Record<string, number>;
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

  const restoreResult = data as RestoreResult | null;
  const totalRestored = Number(restoreResult?.totalRestored ?? 0);

  redirect(
    `${backupPath}?restore_success=${encodeURIComponent(
      `Backup restaurado. ${totalRestored} registro(s) foram aplicados ao workspace.`
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
