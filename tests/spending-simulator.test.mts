import assert from "node:assert/strict";
import test from "node:test";
import { simulateSpendingDecision } from "../lib/spending-simulator.ts";

test("permite gasto quando a margem continua confortavel", () => {
  const result = simulateSpendingDecision({
    amount: 80,
    commitments: [
      {
        amount: -200,
        date: "2026-05-08",
        title: "Mercado"
      }
    ],
    currentBalance: 1000,
    spendDate: "2026-05-04"
  });

  assert.equal(result.decision, "can_spend");
  assert.equal(result.label, "Pode");
  assert.equal(result.minimumBalance, 720);
});

test("marca gasto como risco quando a margem fica baixa", () => {
  const result = simulateSpendingDecision({
    amount: 80,
    commitments: [
      {
        amount: -170,
        date: "2026-05-08",
        title: "Energia"
      }
    ],
    currentBalance: 300,
    riskBuffer: 100,
    spendDate: "2026-05-04"
  });

  assert.equal(result.decision, "risky");
  assert.equal(result.label, "Pode, mas com risco");
  assert.equal(result.minimumBalance, 50);
  assert.match(result.message, /margem/);
});

test("nao recomenda gasto que deixa previsao negativa", () => {
  const result = simulateSpendingDecision({
    amount: 120,
    commitments: [
      {
        amount: -250,
        date: "2026-05-18",
        title: "Cartao"
      }
    ],
    currentBalance: 300,
    spendDate: "2026-05-04"
  });

  assert.equal(result.decision, "not_recommended");
  assert.equal(result.label, "Não deveria");
  assert.equal(result.minimumBalance, -70);
  assert.match(result.message, /Não recomendo/);
});
