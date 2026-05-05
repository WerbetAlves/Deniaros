import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ensureDefaultWorkspace } from "../lib/workspace-bootstrap.ts";

test("bootstrap de workspace novo nao cria contas, transacoes ou agenda automaticamente", async () => {
  const supabase = new BootstrapSupabase();
  const workspaceId = await ensureDefaultWorkspace(
    supabase as unknown as SupabaseClient,
    { id: "user-1" } as User
  );

  assert.equal(workspaceId, "workspace-1");
  assert.equal(supabase.insertedWorkspaces, 1);
  assert.equal(supabase.touchedTables.has("accounts"), false);
  assert.equal(supabase.touchedTables.has("transactions"), false);
  assert.equal(supabase.touchedTables.has("scheduled_items"), false);
  assert.ok(supabase.insertedCategories > 0);
  assert.ok(supabase.insertedPayees > 0);
});

class BootstrapSupabase {
  insertedCategories = 0;
  insertedPayees = 0;
  insertedWorkspaces = 0;
  touchedTables = new Set<string>();

  from(table: string) {
    this.touchedTables.add(table);

    if (["accounts", "transactions", "scheduled_items"].includes(table)) {
      throw new Error(`Bootstrap nao deve tocar em ${table}.`);
    }

    return new BootstrapQuery(this, table);
  }
}

class BootstrapQuery {
  private mode: "read" | "insert" = "read";
  private row: Record<string, unknown> | null = null;
  private readonly supabase: BootstrapSupabase;
  private readonly table: string;

  constructor(supabase: BootstrapSupabase, table: string) {
    this.supabase = supabase;
    this.table = table;
  }

  select() {
    return this;
  }

  eq() {
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  insert(row: Record<string, unknown>) {
    this.mode = "insert";
    this.row = row;

    if (this.table === "workspaces") {
      this.supabase.insertedWorkspaces += 1;
    }

    if (this.table === "categories") {
      this.supabase.insertedCategories += 1;
    }

    if (this.table === "payees") {
      this.supabase.insertedPayees += 1;
      return Promise.resolve({ error: null });
    }

    return this;
  }

  maybeSingle() {
    return Promise.resolve({ data: null, error: null });
  }

  single() {
    if (this.mode !== "insert") {
      return Promise.resolve({ data: null, error: null });
    }

    if (this.table === "workspaces") {
      assert.equal(this.row?.owner_id, "user-1");
      return Promise.resolve({ data: { id: "workspace-1" }, error: null });
    }

    if (this.table === "categories") {
      return Promise.resolve({
        data: { id: `category-${this.supabase.insertedCategories}` },
        error: null
      });
    }

    return Promise.resolve({ data: null, error: null });
  }
}
