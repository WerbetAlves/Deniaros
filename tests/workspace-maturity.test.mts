import assert from "node:assert/strict";
import test from "node:test";
import {
  canShowAdvancedInsights,
  getWorkspaceMaturity
} from "../lib/workspace-maturity.ts";

test("workspace maturity starts empty until the first account exists", () => {
  assert.equal(
    getWorkspaceMaturity({ accountCount: 0, transactionCount: 0 }),
    "workspace_empty"
  );
});

test("workspace maturity requires a first movement after the first account", () => {
  assert.equal(
    getWorkspaceMaturity({ accountCount: 1, transactionCount: 0 }),
    "workspace_initialized"
  );
});

test("workspace maturity keeps early data in starter mode before insights", () => {
  assert.equal(
    getWorkspaceMaturity({ accountCount: 1, transactionCount: 3, scheduledCount: 1 }),
    "workspace_active"
  );
});

test("workspace maturity unlocks advanced insights after enough history", () => {
  const maturity = getWorkspaceMaturity({
    accountCount: 1,
    transactionCount: 8,
    scheduledCount: 0
  });

  assert.equal(maturity, "workspace_ready_for_insights");
  assert.equal(canShowAdvancedInsights(maturity), true);
});
