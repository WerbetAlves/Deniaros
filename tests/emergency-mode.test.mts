import assert from "node:assert/strict";
import test from "node:test";
import type { ScheduledItem } from "../lib/domain.ts";
import { buildEmergencyModePlan } from "../lib/emergency-mode.ts";

const items: ScheduledItem[] = [
  {
    accountId: "checking",
    amount: -900,
    currency: "BRL",
    dueDate: "2026-05-03",
    id: "rent",
    kind: "bill",
    recurrence: "once",
    status: "overdue",
    title: "Aluguel"
  },
  {
    accountId: "checking",
    amount: -120,
    currency: "BRL",
    dueDate: "2026-05-07",
    id: "streaming",
    kind: "bill",
    recurrence: "once",
    status: "due-soon",
    title: "Streaming"
  },
  {
    accountId: "checking",
    amount: -160,
    currency: "BRL",
    dueDate: "2026-05-08",
    id: "energy",
    kind: "bill",
    recurrence: "once",
    status: "due-soon",
    title: "Energia"
  }
];

test("modo emergencia prioriza vencidos e essenciais", () => {
  const plan = buildEmergencyModePlan({
    currentBalance: 320,
    items,
    today: new Date("2026-05-04T12:00:00")
  });

  assert.equal(plan.overdue.length, 1);
  assert.equal(plan.dueNext7Days.length, 2);
  assert.equal(plan.essentials.map((item) => item.id).join(","), "rent,energy");
  assert.equal(plan.recommendedOrder[0]?.id, "rent");
  assert.match(plan.survivalMessage, /Priorize o essencial/);
});
