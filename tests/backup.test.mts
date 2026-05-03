import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWorkspaceBackupFileName,
  sanitizeBackupSlug,
  validateBackupPayload,
  workspaceScopedBackupTables
} from "../lib/backup.ts";

test("mantem contrato de tabelas essenciais no backup do workspace", () => {
  assert.ok(workspaceScopedBackupTables.includes("accounts"));
  assert.ok(workspaceScopedBackupTables.includes("transactions"));
  assert.ok(workspaceScopedBackupTables.includes("scheduled_items"));
  assert.ok(workspaceScopedBackupTables.includes("saas_support_tickets"));
  assert.ok(workspaceScopedBackupTables.includes("saas_support_ticket_messages"));
  assert.ok(workspaceScopedBackupTables.includes("saas_subscriptions"));
  assert.ok(workspaceScopedBackupTables.includes("privacy_preferences"));
  assert.ok(workspaceScopedBackupTables.includes("data_access_events"));
});

test("valida payload antes de restaurar backup", () => {
  const payload = {
    app: "Deniaros",
    exportVersion: 1,
    tables: {
      accounts: { data: [] }
    },
    user: { id: "user-1" },
    workspace: { id: "workspace-1" }
  };

  assert.equal(validateBackupPayload(payload, "user-1"), null);
  assert.equal(validateBackupPayload(payload, "user-2"), "Este backup pertence a outro usuario.");
  assert.equal(validateBackupPayload({ ...payload, app: "Outro" }, "user-1"), "Este arquivo nao e um backup Deniaros.");
  assert.equal(validateBackupPayload({ ...payload, exportVersion: 99 }, "user-1"), "Versao de backup nao suportada.");
  assert.equal(validateBackupPayload({ ...payload, tables: undefined }, "user-1"), "O backup nao contem tabelas restauraveis.");
});

test("gera nome de arquivo seguro para download do backup", () => {
  assert.equal(sanitizeBackupSlug("Meu Deniaros Ágil!"), "meu-deniaros-agil");
  assert.equal(
    buildWorkspaceBackupFileName("Família Costa & Alves", "2026-05-03T15:30:00.000Z"),
    "deniaros-familia-costa-alves-2026-05-03.json"
  );
});
