import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOnboardingGuidance,
  getQuickOnboardingAnswers
} from "../lib/onboarding-guidance.ts";

test("extrai onboarding rapido de classic_answers com valores seguros", () => {
  const answers = getQuickOnboardingAnswers({
    quickOnboarding: {
      aiLevel: "active",
      completedAt: "2026-05-05T10:00:00.000Z",
      goal: "leave_debt",
      incomeMode: "multiple_sources",
      startMode: "import_csv",
      usage: "family"
    }
  });

  assert.equal(answers?.usage, "family");
  assert.equal(answers?.goal, "leave_debt");
  assert.equal(answers?.startMode, "import_csv");
  assert.equal(answers?.aiLevel, "active");
});

test("normaliza valores desconhecidos para o trilho padrao", () => {
  const answers = getQuickOnboardingAnswers({
    quickOnboarding: {
      aiLevel: "magic",
      goal: "rich",
      incomeMode: "unknown",
      startMode: "bank_now",
      usage: "alien"
    }
  });

  assert.equal(answers?.usage, "personal");
  assert.equal(answers?.goal, "organize_spending");
  assert.equal(answers?.incomeMode, "fixed_salary");
  assert.equal(answers?.startMode, "manual");
  assert.equal(answers?.aiLevel, "consultative");
});

test("orienta importacao CSV como proximo passo depois da carteira", () => {
  const guidance = buildOnboardingGuidance({
    aiLevel: "consultative",
    goal: "plan_month",
    incomeMode: "fixed_salary",
    startMode: "import_csv",
    usage: "personal"
  });

  assert.equal(guidance.transactionHref, "/imports?onboarding=1");
  assert.equal(guidance.transactionActionLabel, "Importar extrato");
  assert.match(guidance.quickStartSubtitle, /importacao/);
});

test("ajusta linguagem para familia e dividas", () => {
  const guidance = buildOnboardingGuidance({
    aiLevel: "active",
    goal: "leave_debt",
    incomeMode: "multiple_sources",
    startMode: "manual",
    usage: "family"
  });

  assert.match(guidance.contextLabel, /familia/);
  assert.match(guidance.accountDescription, /familia|casal/);
  assert.match(guidance.scheduleDescription, /dividas|vencimentos/);
  assert.match(guidance.aiDescription, /proximo passo|priorizar/);
});

test("retorna orientacao conservadora quando nao ha onboarding salvo", () => {
  const guidance = buildOnboardingGuidance(null);

  assert.equal(guidance.accountHref, "/accounts?mode=create&kind=cash&first=1");
  assert.equal(guidance.transactionHref, "/transactions/new");
  assert.equal(guidance.starterMetricValue, "Criar carteira");
});
