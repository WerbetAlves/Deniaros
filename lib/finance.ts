import type {
  Account,
  AccountBalance,
  CurrencyCode,
  ForecastEvent,
  ForecastPoint,
  ForecastProjection,
  LocaleCode,
  ScheduledItem,
  Transaction
} from "@/lib/domain";

const currencyFormatters = new Map<string, Intl.NumberFormat>();
const shortDateFormatters = new Map<string, Intl.DateTimeFormat>();

export function formatCurrency(
  value: number,
  currency: CurrencyCode = "BRL",
  locale: LocaleCode = "pt-BR"
) {
  const key = `${locale}:${currency}`;
  let formatter = currencyFormatters.get(key);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency
    });
    currencyFormatters.set(key, formatter);
  }

  return formatter.format(value);
}

export function formatShortDate(value: string, locale: LocaleCode = "pt-BR") {
  let formatter = shortDateFormatters.get(locale);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short"
    });
    shortDateFormatters.set(locale, formatter);
  }

  const date = parseDisplayDate(value);

  if (!date) {
    return "Data indisponivel";
  }

  return formatter.format(date);
}

function parseDisplayDate(value: string) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return null;
  }

  const date = new Date(
    normalizedValue.includes("T") ? normalizedValue : `${normalizedValue}T12:00:00`
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

export function getAccountBalances(
  accounts: Account[],
  transactions: Transaction[]
): AccountBalance[] {
  const transactionTotals = new Map<string, number>();

  for (const transaction of transactions) {
    if (!isPostedTransaction(transaction)) {
      continue;
    }

    transactionTotals.set(
      transaction.accountId,
      (transactionTotals.get(transaction.accountId) ?? 0) + transaction.amount
    );

    if (transaction.transferAccountId) {
      transactionTotals.set(
        transaction.transferAccountId,
        (transactionTotals.get(transaction.transferAccountId) ?? 0) - transaction.amount
      );
    }
  }

  return accounts.map((account) => {
    return {
      ...account,
      currentBalance: account.openingBalance + (transactionTotals.get(account.id) ?? 0)
    };
  });
}

export function getTotalBalance(accounts: AccountBalance[]) {
  return accounts.reduce((total, account) => total + account.currentBalance, 0);
}

export function getPostedIncome(transactions: Transaction[]) {
  let total = 0;

  for (const transaction of transactions) {
    if (isPostedTransaction(transaction) && transaction.amount > 0 && !transaction.transferAccountId) {
      total += transaction.amount;
    }
  }

  return total;
}

export function getPostedExpenses(transactions: Transaction[]) {
  let total = 0;

  for (const transaction of transactions) {
    if (isPostedTransaction(transaction) && transaction.amount < 0 && !transaction.transferAccountId) {
      total += Math.abs(transaction.amount);
    }
  }

  return total;
}

export function getPendingNetChange(transactions: Transaction[]) {
  let total = 0;

  for (const transaction of transactions) {
    if (isPostedTransaction(transaction) || transaction.transferAccountId) {
      continue;
    }

    total += transaction.amount;
  }

  return total;
}

export function isPostedTransaction(transaction: Transaction) {
  return transaction.status === "posted";
}

export function getTransactionAmountForAccount(transaction: Transaction, accountId: string) {
  if (transaction.transferAccountId === accountId) {
    return -transaction.amount;
  }

  if (transaction.accountId === accountId) {
    return transaction.amount;
  }

  return 0;
}

export function getScheduledIncome(items: ScheduledItem[]) {
  let total = 0;

  for (const item of items) {
    if (item.status !== "paid" && item.amount > 0) {
      total += item.amount;
    }
  }

  return total;
}

export function getScheduledExpenses(items: ScheduledItem[]) {
  let total = 0;

  for (const item of items) {
    if (item.status !== "paid" && item.amount < 0) {
      total += Math.abs(item.amount);
    }
  }

  return total;
}

export function getUpcomingItems(items: ScheduledItem[]) {
  return [...getOpenScheduledItems(items)].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function getOpenScheduledItems(items: ScheduledItem[]) {
  return items.filter((item) => item.status !== "paid");
}

export function buildForecast(
  currentBalance: number,
  scheduledItems: ScheduledItem[]
): ForecastPoint[] {
  return buildForecastProjection({
    currentBalance,
    scheduledItems,
    horizonDays: 14
  }).checkpoints;
}

export function buildForecastProjection({
  currentBalance,
  horizonDays = 90,
  scheduledItems,
  today = new Date()
}: {
  currentBalance: number;
  scheduledItems: ScheduledItem[];
  horizonDays?: number;
  today?: Date;
}): ForecastProjection {
  const horizonStart = normalizeDate(today);
  const horizonEnd = addDays(horizonStart, horizonDays);
  const events = expandScheduledEvents(scheduledItems, horizonStart, horizonEnd);
  const totalsByDate = groupForecastTotalsByDate(events);
  const dailyPoints: ForecastPoint[] = [];
  let runningBalance = currentBalance;

  for (let dayIndex = 0; dayIndex <= horizonDays; dayIndex += 1) {
    const date = addDays(horizonStart, dayIndex);
    const isoDate = toIsoDate(date);
    const dayTotal = totalsByDate.get(isoDate) ?? 0;
    runningBalance += dayTotal;

    dailyPoints.push({
      label: formatForecastLabel(dayIndex),
      date: isoDate,
      balance: runningBalance
    });
  }

  const checkpoints = [0, 7, 30, 60, 90]
    .filter((days) => days <= horizonDays)
    .map((days) => dailyPoints[days])
    .filter(Boolean);
  const lowestPoint = dailyPoints.reduce(
    (lowest, point) => (point.balance < lowest.balance ? point : lowest),
    dailyPoints[0] ?? {
      balance: currentBalance,
      date: toIsoDate(horizonStart),
      label: "Hoje"
    }
  );
  const firstNegativePoint = dailyPoints.find((point) => point.balance < 0);
  let scheduledIncome = 0;
  let scheduledExpenses = 0;

  for (const event of events) {
    if (event.amount > 0) {
      scheduledIncome += event.amount;
    } else if (event.amount < 0) {
      scheduledExpenses += Math.abs(event.amount);
    }
  }
  const endingBalance = dailyPoints[dailyPoints.length - 1]?.balance ?? currentBalance;
  const cashPressure = scheduledExpenses / Math.max(1, Math.abs(currentBalance) + scheduledIncome);
  const riskLevel =
    firstNegativePoint || lowestPoint.balance < 0
      ? "danger"
      : cashPressure > 0.65 || lowestPoint.balance < currentBalance * 0.25
        ? "attention"
        : "stable";

  return {
    checkpoints,
    dailyPoints,
    events,
    generatedAt: new Date().toISOString(),
    horizonEnd: toIsoDate(horizonEnd),
    horizonStart: toIsoDate(horizonStart),
    summary: {
      endingBalance,
      eventCount: events.length,
      firstNegativeBalance: firstNegativePoint?.balance,
      firstNegativeDate: firstNegativePoint?.date,
      horizonDays,
      lowestBalance: lowestPoint.balance,
      lowestDate: lowestPoint.date,
      netScheduled: scheduledIncome - scheduledExpenses,
      riskLevel,
      scheduledExpenses,
      scheduledIncome,
      startingBalance: currentBalance
    }
  };
}

function expandScheduledEvents(
  scheduledItems: ScheduledItem[],
  horizonStart: Date,
  horizonEnd: Date
) {
  const events: ForecastEvent[] = [];

  for (const item of getOpenScheduledItems(scheduledItems)) {
    const dueDate = parseIsoDate(item.dueDate);
    const firstEventDate = dueDate < horizonStart ? horizonStart : dueDate;

    if (firstEventDate <= horizonEnd) {
      events.push(createForecastEvent(item, firstEventDate, dueDate));
    }

    if (item.recurrence === "once") {
      continue;
    }

    let nextDate = advanceScheduledDate(dueDate, item.recurrence);
    let guard = 0;

    while (nextDate < horizonStart && guard < 120) {
      nextDate = advanceScheduledDate(nextDate, item.recurrence);
      guard += 1;
    }

    while (nextDate <= horizonEnd && guard < 120) {
      const eventDate = nextDate < horizonStart ? horizonStart : nextDate;

      if (toIsoDate(eventDate) !== toIsoDate(firstEventDate)) {
        events.push(createForecastEvent(item, eventDate, nextDate));
      }

      nextDate = advanceScheduledDate(nextDate, item.recurrence);
      guard += 1;
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

function createForecastEvent(
  item: ScheduledItem,
  eventDate: Date,
  originalDueDate: Date
): ForecastEvent {
  return {
    amount: item.amount,
    currency: item.currency,
    date: toIsoDate(eventDate),
    id: `${item.id}-${toIsoDate(eventDate)}`,
    isOverdue: originalDueDate < eventDate,
    kind: item.kind,
    originalDueDate: toIsoDate(originalDueDate),
    recurrence: item.recurrence,
    scheduledItemId: item.id,
    status: item.status,
    title: item.title
  };
}

function groupForecastTotalsByDate(events: ForecastEvent[]) {
  const grouped = new Map<string, number>();

  for (const event of events) {
    grouped.set(event.date, (grouped.get(event.date) ?? 0) + event.amount);
  }

  return grouped;
}

function formatForecastLabel(dayIndex: number) {
  if (dayIndex === 0) {
    return "Hoje";
  }

  if (dayIndex === 1) {
    return "Amanhã";
  }

  return `Em ${dayIndex} dias`;
}

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  nextDate.setHours(12, 0, 0, 0);
  return nextDate;
}

export function getNextScheduledDueDate(
  value: string,
  recurrence: ScheduledItem["recurrence"]
) {
  const date = parseIsoDate(value);

  if (recurrence === "weekly") {
    return toIsoDate(addDays(date, 7));
  }

  if (recurrence === "monthly") {
    return toIsoDate(addMonthsClamped(date, 1));
  }

  return toIsoDate(date);
}

export function getScheduledStatusForDate(value: string, today = new Date()): ScheduledItem["status"] {
  const dueDate = parseIsoDate(value);
  const normalizedToday = normalizeDate(today);
  const dueSoonLimit = addDays(normalizedToday, 7);

  if (dueDate < normalizedToday) {
    return "overdue";
  }

  if (dueDate <= dueSoonLimit) {
    return "due-soon";
  }

  return "scheduled";
}

function advanceScheduledDate(date: Date, recurrence: ScheduledItem["recurrence"]) {
  return parseIsoDate(getNextScheduledDueDate(toIsoDate(date), recurrence));
}

function addMonthsClamped(date: Date, months: number) {
  const targetMonthIndex = date.getMonth() + months;
  const targetYear = date.getFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0, 12, 0, 0).getDate();
  const targetDay = Math.min(date.getDate(), lastDayOfTargetMonth);
  return new Date(targetYear, targetMonth, targetDay, 12, 0, 0);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: string) {
  return new Date(`${value}T12:00:00`);
}
