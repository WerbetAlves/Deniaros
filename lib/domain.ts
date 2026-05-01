export type AccountType =
  | "checking"
  | "cash"
  | "credit"
  | "business"
  | "savings"
  | "asset"
  | "liability"
  | "loan"
  | "investment"
  | "retirement";

export type CurrencyCode = string;
export type LocaleCode = string;
export type TimeZone = string;
export type CountryCode = string;

export type Workspace = {
  id: string;
  name: string;
  type: "personal" | "family" | "business";
  baseCurrency: CurrencyCode;
  locale: LocaleCode;
  timeZone: TimeZone;
  countryCode: CountryCode;
};

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  currency: CurrencyCode;
  color: string;
};

export type CategoryKind = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  parentId?: string;
};

export type Payee = {
  id: string;
  name: string;
  type: "person" | "company" | "place";
};

export type TransactionStatus = "posted" | "pending";
export type TransactionSource =
  | "manual"
  | "imported"
  | "openfinance"
  | "recurring"
  | "assistant";

export type Transaction = {
  id: string;
  accountId: string;
  transferAccountId?: string;
  categoryId?: string;
  payeeId?: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  date: string;
  status: TransactionStatus;
  source: TransactionSource;
  scheduledItemId?: string;
  scheduledOccurrenceDate?: string;
  reconciledAt?: string;
  reconciledBy?: string;
};

export type ScheduleKind = "bill" | "deposit" | "saving";
export type ScheduleStatus = "scheduled" | "due-soon" | "overdue" | "paid";

export type ScheduledItem = {
  id: string;
  kind: ScheduleKind;
  accountId: string;
  categoryId?: string;
  payeeId?: string;
  title: string;
  amount: number;
  currency: CurrencyCode;
  dueDate: string;
  recurrence: "once" | "weekly" | "monthly";
  status: ScheduleStatus;
};

export type ForecastPoint = {
  label: string;
  date: string;
  balance: number;
};

export type ForecastEvent = {
  id: string;
  scheduledItemId: string;
  title: string;
  amount: number;
  currency: CurrencyCode;
  date: string;
  originalDueDate: string;
  kind: ScheduleKind;
  status: ScheduleStatus;
  recurrence: ScheduledItem["recurrence"];
  isOverdue: boolean;
};

export type ForecastRiskLevel = "stable" | "attention" | "danger";

export type ForecastSummary = {
  horizonDays: number;
  startingBalance: number;
  endingBalance: number;
  lowestBalance: number;
  lowestDate: string;
  firstNegativeDate?: string;
  firstNegativeBalance?: number;
  scheduledIncome: number;
  scheduledExpenses: number;
  netScheduled: number;
  eventCount: number;
  riskLevel: ForecastRiskLevel;
};

export type ForecastProjection = {
  generatedAt: string;
  horizonStart: string;
  horizonEnd: string;
  dailyPoints: ForecastPoint[];
  checkpoints: ForecastPoint[];
  events: ForecastEvent[];
  summary: ForecastSummary;
};

export type AccountBalance = Account & {
  currentBalance: number;
};
