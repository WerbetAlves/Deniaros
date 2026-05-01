import type { Account } from "@/lib/domain";

export type DebtReductionStrategy = "avalanche" | "snowball";

export type DebtReductionDebt = {
  id: string;
  workspaceId: string;
  linkedAccountId?: string;
  name: string;
  balance: number;
  annualInterestRate: number;
  minimumPayment: number;
  plannedPayment: number;
  creditLimit: number;
  dueDay?: number;
  includedInPlan: boolean;
  notes: string;
};

export type DebtReductionDebtRow = {
  id: string;
  workspace_id: string;
  linked_account_id: string | null;
  name: string;
  balance: number | string | null;
  annual_interest_rate: number | string | null;
  minimum_payment: number | string | null;
  planned_payment: number | string | null;
  credit_limit: number | string | null;
  due_day: number | null;
  included_in_plan: boolean | null;
  notes: string | null;
};

export type DebtReductionMonth = {
  monthIndex: number;
  label: string;
  startingBalance: number;
  payment: number;
  principal: number;
  interest: number;
  endingBalance: number;
  targetDebtName?: string;
};

export type DebtReductionPlan = {
  strategy: DebtReductionStrategy;
  totalDebt: number;
  monthlyPayment: number;
  extraPayment: number;
  totalInterest: number;
  totalPaid: number;
  payoffMonths: number;
  payoffDateLabel: string;
  firstDebtPaid?: string;
  recommendedFirstDebt?: DebtReductionDebt;
  months: DebtReductionMonth[];
};

export function mapDebtReductionDebt(row: DebtReductionDebtRow): DebtReductionDebt {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    linkedAccountId: row.linked_account_id ?? undefined,
    name: row.name,
    balance: Number(row.balance ?? 0),
    annualInterestRate: Number(row.annual_interest_rate ?? 0),
    minimumPayment: Number(row.minimum_payment ?? 0),
    plannedPayment: Number(row.planned_payment ?? 0),
    creditLimit: Number(row.credit_limit ?? 0),
    dueDay: row.due_day ?? undefined,
    includedInPlan: row.included_in_plan ?? true,
    notes: row.notes ?? ""
  };
}

export function buildDebtFromAccount(
  account: Account & { currentBalance?: number },
  workspaceId: string
): DebtReductionDebt {
  const currentBalance = Math.abs(account.currentBalance ?? account.openingBalance);

  return {
    annualInterestRate: account.type === "credit" ? 12 : 0,
    balance: currentBalance,
    creditLimit: Math.max(currentBalance, 0),
    dueDay: undefined,
    id: `account-${account.id}`,
    includedInPlan: account.type === "credit" || currentBalance > 0,
    linkedAccountId: account.id,
    minimumPayment: Math.max(50, currentBalance * 0.03),
    name: account.name,
    notes: "Sugestão criada a partir da conta existente.",
    plannedPayment: Math.max(50, currentBalance * 0.03),
    workspaceId
  };
}

export function buildDebtReductionPlan({
  debts,
  extraPayment,
  locale,
  strategy
}: {
  debts: DebtReductionDebt[];
  extraPayment: number;
  locale: string;
  strategy: DebtReductionStrategy;
}): DebtReductionPlan {
  const activeDebts = debts
    .filter((debt) => debt.includedInPlan && debt.balance > 0)
    .map((debt) => ({
      ...debt,
      remainingBalance: debt.balance
    }));
  const totalDebt = activeDebts.reduce((total, debt) => total + debt.balance, 0);
  const basePayment = activeDebts.reduce(
    (total, debt) => total + Math.max(debt.minimumPayment, debt.plannedPayment),
    0
  );
  const monthlyPayment = basePayment + Math.max(0, extraPayment);
  const months: DebtReductionMonth[] = [];
  let totalInterest = 0;
  let firstDebtPaid: string | undefined;

  for (let monthIndex = 1; monthIndex <= 360; monthIndex += 1) {
    const openDebts = activeDebts.filter((debt) => debt.remainingBalance > 0.01);

    if (!openDebts.length) {
      break;
    }

    const startingBalance = openDebts.reduce((total, debt) => total + debt.remainingBalance, 0);
    let monthInterest = 0;

    for (const debt of openDebts) {
      const interest = debt.remainingBalance * (debt.annualInterestRate / 100 / 12);
      debt.remainingBalance += interest;
      monthInterest += interest;
    }

    let availablePayment = monthlyPayment;
    let principalPaid = 0;

    for (const debt of openDebts) {
      const minimumPayment = Math.min(
        debt.remainingBalance,
        Math.max(debt.minimumPayment, debt.plannedPayment)
      );
      debt.remainingBalance -= minimumPayment;
      availablePayment -= minimumPayment;
      principalPaid += Math.max(0, minimumPayment - debt.remainingBalance * 0);

      if (debt.remainingBalance <= 0.01 && !firstDebtPaid) {
        firstDebtPaid = debt.name;
      }
    }

    const targetDebt = chooseTargetDebt(openDebts, strategy);

    if (targetDebt && availablePayment > 0) {
      const extra = Math.min(targetDebt.remainingBalance, availablePayment);
      targetDebt.remainingBalance -= extra;
      principalPaid += extra;

      if (targetDebt.remainingBalance <= 0.01 && !firstDebtPaid) {
        firstDebtPaid = targetDebt.name;
      }
    }

    const endingBalance = activeDebts
      .filter((debt) => debt.remainingBalance > 0.01)
      .reduce((total, debt) => total + debt.remainingBalance, 0);
    totalInterest += monthInterest;

    months.push({
      endingBalance,
      interest: monthInterest,
      label: formatPlanMonth(monthIndex, locale),
      monthIndex,
      payment: Math.min(monthlyPayment, startingBalance + monthInterest),
      principal: Math.max(0, startingBalance + monthInterest - endingBalance),
      startingBalance,
      targetDebtName: targetDebt?.name
    });

    if (endingBalance <= 0.01) {
      break;
    }
  }

  const payoffMonths = months.length;
  const payoffDateLabel = payoffMonths ? formatPlanMonth(payoffMonths, locale) : "sem data";
  const recommendedFirstDebt = chooseTargetDebt(activeDebts, strategy);

  return {
    extraPayment: Math.max(0, extraPayment),
    firstDebtPaid,
    monthlyPayment,
    months,
    payoffDateLabel,
    payoffMonths,
    recommendedFirstDebt,
    strategy,
    totalDebt,
    totalInterest,
    totalPaid: totalDebt + totalInterest
  };
}

function chooseTargetDebt<T extends { annualInterestRate: number; balance?: number; remainingBalance?: number }>(
  debts: T[],
  strategy: DebtReductionStrategy
) {
  const openDebts = debts.filter((debt) => (debt.remainingBalance ?? debt.balance ?? 0) > 0.01);

  if (strategy === "snowball") {
    return [...openDebts].sort(
      (a, b) => (a.remainingBalance ?? a.balance ?? 0) - (b.remainingBalance ?? b.balance ?? 0)
    )[0];
  }

  return [...openDebts].sort((a, b) => b.annualInterestRate - a.annualInterestRate)[0];
}

function formatPlanMonth(monthIndex: number, locale: string) {
  const date = new Date();
  date.setMonth(date.getMonth() + monthIndex);

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric"
  }).format(date);
}
