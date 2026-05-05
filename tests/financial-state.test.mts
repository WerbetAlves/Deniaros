import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyFinancialWorkspaceState,
  getFinancialNextStep
} from "../lib/financial-state.ts";

test("classifica workspace vazio quando nao existe carteira", () => {
  assert.equal(
    classifyFinancialWorkspaceState({
      accountCount: 0,
      transactionCount: 0
    }),
    "empty"
  );
});

test("classifica workspace inicializado quando existe carteira sem movimento", () => {
  assert.equal(
    classifyFinancialWorkspaceState({
      accountCount: 1,
      transactionCount: 0
    }),
    "initialized"
  );
});

test("classifica workspace ativo quando existe base sem risco imediato", () => {
  assert.equal(
    classifyFinancialWorkspaceState({
      accountCount: 1,
      currentBalance: 1800,
      next7DaysNetCommitments: -300,
      projectedLowestBalance: 1200,
      transactionCount: 6
    }),
    "active"
  );
});

test("classifica risco quando compromissos proximos reduzem margem", () => {
  assert.equal(
    classifyFinancialWorkspaceState({
      accountCount: 1,
      currentBalance: 500,
      dueSoonCommitmentCount: 2,
      next7DaysNetCommitments: -380,
      projectedLowestBalance: 120,
      transactionCount: 6
    }),
    "at_risk"
  );
});

test("classifica emergencia com vencidos ou saldo negativo projetado", () => {
  assert.equal(
    classifyFinancialWorkspaceState({
      accountCount: 1,
      currentBalance: 300,
      overdueCommitmentCount: 1,
      projectedLowestBalance: 100,
      transactionCount: 6
    }),
    "emergency"
  );

  assert.equal(
    classifyFinancialWorkspaceState({
      accountCount: 1,
      currentBalance: 300,
      firstNegativeDate: "2026-05-18",
      projectedLowestBalance: -50,
      transactionCount: 6
    }),
    "emergency"
  );
});

test("proximo passo traz CTA correto por estado", () => {
  assert.equal(getFinancialNextStep("empty").actionLabel, "Criar primeira carteira");
  assert.equal(getFinancialNextStep("initialized").actionLabel, "Registrar movimento");
  assert.equal(getFinancialNextStep("active").secondaryLabel, "Simular gasto");
  assert.equal(getFinancialNextStep("emergency").actionLabel, "Entrar no modo emergência");
});
