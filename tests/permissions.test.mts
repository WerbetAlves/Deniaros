import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdminRoleLabel,
  hasAdminPermission,
  requireAdminPermission
} from "../lib/admin-permissions.ts";

test("aplica matriz de permissoes por papel administrativo", () => {
  assert.equal(hasAdminPermission("founder", "manage_admins"), true);
  assert.equal(hasAdminPermission("admin", "manage_feature_flags"), true);
  assert.equal(hasAdminPermission("billing", "manage_subscriptions"), true);
  assert.equal(hasAdminPermission("support", "manage_support"), true);

  assert.equal(hasAdminPermission("support", "manage_subscriptions"), false);
  assert.equal(hasAdminPermission("billing", "manage_support"), false);
  assert.equal(hasAdminPermission("admin", "manage_admins"), false);
});

test("mantem fallback administrativo seguro e rotulos humanos", () => {
  assert.equal(hasAdminPermission(undefined, "read_admin"), true);
  assert.equal(hasAdminPermission(undefined, "manage_admins"), false);
  assert.equal(getAdminRoleLabel("billing"), "Financeiro");
  assert.equal(getAdminRoleLabel(undefined), "Admin");
});

test("bloqueia acao administrativa sem permissao explicita", () => {
  requireAdminPermission("founder", "manage_admins");
  assert.throws(
    () => requireAdminPermission("support", "manage_subscriptions", "Sem permissao."),
    /Sem permissao/
  );
});
