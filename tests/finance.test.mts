import assert from "node:assert/strict";
import test from "node:test";
import type { Account, ScheduledItem, Transaction } from "../lib/domain.ts";
import {
  buildForecastProjection,
  getAccountBalances,
  getNextScheduledDueDate,
  getPendingNetChange,
  getPostedExpenses,
  getPostedIncome,
  getScheduledStatusForDate,
  getTotalBalance,
  getTransactionAmountForAccount
} from "../lib/finance.ts";

const accounts: Account[] = [
  {
    id: "checking",
    name: "Conta principal",
    type: "checking",
    openingBalance: 1000,
    currency: "BRL",
    color: "emerald"
  },
  {
    id: "cash",
    name: "Carteira física",
    type: "cash",
    openingBalance: 100,
    currency: "BRL",
    color: "gold"
  }
];

test("calcula saldo consolidado sem duplicar transferencia interna", () => {
  const transactions: Transaction[] = [
    {
      id: "income",
      accountId: "checking",
      amount: 500,
      currency: "BRL",
      date: "2026-04-01",
      description: "Receita",
      status: "posted",
      source: "manual"
    },
    {
      id: "expense",
      accountId: "checking",
      amount: -150,
      currency: "BRL",
      date: "2026-04-02",
      description: "Despesa",
      status: "posted",
      source: "manual"
    },
    {
      id: "transfer",
      accountId: "checking",
      transferAccountId: "cash",
      amount: -200,
      currency: "BRL",
      date: "2026-04-03",
      description: "Saque",
      status: "posted",
      source: "manual"
    },
    {
      id: "pending-income",
      accountId: "checking",
      amount: 900,
      currency: "BRL",
      date: "2026-04-04",
      description: "Receita ainda pendente",
      status: "pending",
      source: "manual"
    },
    {
      id: "pending-expense",
      accountId: "checking",
      amount: -75,
      currency: "BRL",
      date: "2026-04-04",
      description: "Despesa ainda pendente",
      status: "pending",
      source: "manual"
    }
  ];

  const balances = getAccountBalances(accounts, transactions);

  assert.equal(balances.find((account) => account.id === "checking")?.currentBalance, 1150);
  assert.equal(balances.find((account) => account.id === "cash")?.currentBalance, 300);
  assert.equal(getTotalBalance(balances), 1450);
  assert.equal(getPostedIncome(transactions), 500);
  assert.equal(getPostedExpenses(transactions), 150);
  assert.equal(getPendingNetChange(transactions), 825);
});

test("mostra transferencia pelo ponto de vista da carteira selecionada", () => {
  const transfer: Transaction = {
    id: "transfer",
    accountId: "checking",
    transferAccountId: "cash",
    amount: -200,
    currency: "BRL",
    date: "2026-04-03",
    description: "Saque",
    status: "posted",
    source: "manual"
  };

  assert.equal(getTransactionAmountForAccount(transfer, "checking"), -200);
  assert.equal(getTransactionAmountForAccount(transfer, "cash"), 200);
  assert.equal(getTransactionAmountForAccount(transfer, "external"), 0);
});

test("avanca recorrencias sem pular meses curtos", () => {
  assert.equal(getNextScheduledDueDate("2026-01-31", "monthly"), "2026-02-28");
  assert.equal(getNextScheduledDueDate("2024-01-31", "monthly"), "2024-02-29");
  assert.equal(getNextScheduledDueDate("2026-04-27", "weekly"), "2026-05-04");
  assert.equal(getNextScheduledDueDate("2026-04-27", "once"), "2026-04-27");
});

test("classifica status da agenda conforme nova data de vencimento", () => {
  const today = new Date("2026-04-20T12:00:00");

  assert.equal(getScheduledStatusForDate("2026-04-19", today), "overdue");
  assert.equal(getScheduledStatusForDate("2026-04-20", today), "due-soon");
  assert.equal(getScheduledStatusForDate("2026-04-27", today), "due-soon");
  assert.equal(getScheduledStatusForDate("2026-04-28", today), "scheduled");
});

test("projeta recorrencias mensais e identifica aperto de caixa", () => {
  const scheduledItems: ScheduledItem[] = [
    {
      id: "rent",
      accountId: "checking",
      amount: -1200,
      currency: "BRL",
      dueDate: "2026-04-10",
      kind: "bill",
      recurrence: "monthly",
      status: "scheduled",
      title: "Aluguel"
    },
    {
      id: "salary",
      accountId: "checking",
      amount: 1000,
      currency: "BRL",
      dueDate: "2026-04-05",
      kind: "deposit",
      recurrence: "once",
      status: "scheduled",
      title: "Receita extra"
    }
  ];

  const projection = buildForecastProjection({
    currentBalance: 500,
    horizonDays: 45,
    scheduledItems,
    today: new Date("2026-04-01T12:00:00")
  });

  assert.equal(projection.summary.scheduledIncome, 1000);
  assert.equal(projection.summary.scheduledExpenses, 2400);
  assert.equal(projection.summary.endingBalance, -900);
  assert.equal(projection.summary.riskLevel, "danger");
  assert.equal(projection.events.filter((event) => event.scheduledItemId === "rent").length, 2);
});

test("mantem conta vencida no horizonte atual como evento em atraso", () => {
  const projection = buildForecastProjection({
    currentBalance: 300,
    horizonDays: 7,
    scheduledItems: [
      {
        id: "late",
        accountId: "checking",
        amount: -250,
        currency: "BRL",
        dueDate: "2026-03-28",
        kind: "bill",
        recurrence: "once",
        status: "overdue",
        title: "Conta vencida"
      }
    ],
    today: new Date("2026-04-01T12:00:00")
  });

  assert.equal(projection.events[0]?.date, "2026-04-01");
  assert.equal(projection.events[0]?.isOverdue, true);
  assert.equal(projection.summary.endingBalance, 50);
});
