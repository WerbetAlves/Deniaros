import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { assertAdminAccess, getAdminAccess } from "../lib/admin-auth.ts";

test("autoriza admin ativo cadastrado na tabela administrativa", async () => {
  const access = await getAdminAccess(
    createAdminSupabase({
      data: { is_active: true, role: "founder", user_id: "user-1" },
      error: null
    }),
    createUser({ id: "user-1" })
  );

  assert.deepEqual(access, {
    allowed: true,
    role: "founder"
  });
});

test("permite bootstrap por metadata quando tabela administrativa ainda nao esta disponivel", async () => {
  const access = await getAdminAccess(
    createAdminSupabase({
      data: null,
      error: { message: "relation admin_users does not exist" }
    }),
    createUser({
      app_metadata: { saas_role: "billing" },
      id: "user-1"
    })
  );

  assert.equal(access.allowed, true);
  assert.match(access.bootstrapHint ?? "", /migration/);
});

test("bloqueia usuario comum sem cadastro ou metadata administrativa", async () => {
  const supabase = createAdminSupabase({ data: null, error: null });
  const user = createUser({ id: "user-1" });

  assert.deepEqual(await getAdminAccess(supabase, user), {
    allowed: false,
    bootstrapHint: undefined,
    role: undefined
  });
  await assert.rejects(() => assertAdminAccess(supabase, user), /Acesso administrativo/);
});

function createUser({
  app_metadata = {},
  id,
  user_metadata = {}
}: {
  app_metadata?: Record<string, unknown>;
  id: string;
  user_metadata?: Record<string, unknown>;
}) {
  return {
    app_metadata,
    id,
    user_metadata
  } as unknown as User;
}

function createAdminSupabase(result: { data: unknown; error: unknown }) {
  return {
    from(table: string) {
      assert.equal(table, "admin_users");
      return {
        select(columns: string) {
          assert.equal(columns, "user_id,role,is_active");
          return {
            eq(column: string, value: string) {
              assert.equal(column, "user_id");
              assert.equal(typeof value, "string");
              return {
                async maybeSingle() {
                  return result;
                }
              };
            }
          };
        }
      };
    }
  } as unknown as SupabaseClient;
}
