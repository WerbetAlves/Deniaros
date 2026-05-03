import assert from "node:assert/strict";
import test from "node:test";
import type { ScheduledItem } from "../lib/domain.ts";
import {
  buildForecastProjection,
  getOpenScheduledItems,
  getScheduledExpenses,
  getScheduledIncome,
  getUpcomingItems
} from "../lib/finance.ts";

const agendaItems: ScheduledItem[] = [
  {
    accountId: "checking",
    amount: -180,
    currency: "BRL",
    dueDate: "2026-05-06",
    id: "internet",
    kind: "bill",
    recurrence: "monthly",
    status: "scheduled",
    title: "Internet"
  },
  {
    accountId: "checking",
    amount: 1200,
    currency: "BRL",
    dueDate: "2026-05-05",
    id: "salary",
    kind: "deposit",
    recurrence: "once",
    status: "scheduled",
    title: "Repasse"
  },
  {
    accountId: "checking",
    amount: -90,
    currency: "BRL",
    dueDate: "2026-05-04",
    id: "paid",
    kind: "bill",
    recurrence: "once",
    status: "paid",
    title: "Conta paga"
  }
];

test("agenda contabiliza apenas compromissos em aberto", () => {
  assert.equal(getOpenScheduledItems(agendaItems).length, 2);
  assert.equal(getScheduledIncome(agendaItems), 1200);
  assert.equal(getScheduledExpenses(agendaItems), 180);
  assert.deepEqual(
    getUpcomingItems(agendaItems).map((item) => item.id),
    ["salary", "internet"]
  );
});

test("previsao de agenda mostra recorrencia e risco de caixa futuro", () => {
  const projection = buildForecastProjection({
    currentBalance: 100,
    horizonDays: 40,
    scheduledItems: agendaItems,
    today: new Date("2026-05-03T12:00:00")
  });

  assert.equal(projection.summary.scheduledIncome, 1200);
  assert.equal(projection.summary.scheduledExpenses, 360);
  assert.equal(projection.events.filter((event) => event.scheduledItemId === "internet").length, 2);
  assert.equal(projection.summary.endingBalance, 940);
  assert.equal(projection.summary.riskLevel, "stable");
});
