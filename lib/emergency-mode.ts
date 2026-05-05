import type { ScheduledItem } from "@/lib/domain";

export type EmergencyPlanItem = ScheduledItem & {
  priority: "essential" | "negotiable";
};

export type EmergencyPlan = {
  dueNext7Days: EmergencyPlanItem[];
  essentials: EmergencyPlanItem[];
  negotiables: EmergencyPlanItem[];
  overdue: EmergencyPlanItem[];
  recommendedOrder: EmergencyPlanItem[];
  survivalMessage: string;
};

const ESSENTIAL_KEYWORDS = [
  "agua",
  "alimenta",
  "aluguel",
  "combustivel",
  "energia",
  "farmacia",
  "gas",
  "internet",
  "mercado",
  "moradia",
  "remedio",
  "saude",
  "transporte"
];

export function buildEmergencyModePlan({
  currentBalance,
  items,
  today = new Date()
}: {
  currentBalance: number;
  items: ScheduledItem[];
  today?: Date;
}): EmergencyPlan {
  const normalizedToday = normalizeDate(today);
  const next7Date = addDays(normalizedToday, 7);
  const openItems = items
    .filter((item) => item.status !== "paid")
    .map((item) => ({
      ...item,
      priority: isEssential(item) ? "essential" : "negotiable"
    }) satisfies EmergencyPlanItem);
  const overdue = openItems.filter((item) => item.status === "overdue" || parseIsoDate(item.dueDate) < normalizedToday);
  const dueNext7Days = openItems.filter((item) => {
    const dueDate = parseIsoDate(item.dueDate);
    return dueDate >= normalizedToday && dueDate <= next7Date;
  });
  const essentials = openItems.filter((item) => item.priority === "essential");
  const negotiables = openItems.filter((item) => item.priority === "negotiable");
  const recommendedOrder = [...overdue, ...dueNext7Days]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((a, b) => comparePriority(a, b) || a.dueDate.localeCompare(b.dueDate));
  const urgentExpenses = [...overdue, ...dueNext7Days]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .reduce((total, item) => total + Math.abs(Math.min(item.amount, 0)), 0);
  const survivalMessage =
    currentBalance < urgentExpenses
      ? `Você tem menos caixa do que os compromissos vencidos e dos próximos 7 dias. Priorize o essencial e negocie o que não interrompe sua rotina.`
      : `Você cobre os compromissos vencidos e dos próximos 7 dias, mas ainda vale preservar margem e evitar novos gastos sem simular.`;

  return {
    dueNext7Days,
    essentials,
    negotiables,
    overdue,
    recommendedOrder,
    survivalMessage
  };
}

function comparePriority(a: EmergencyPlanItem, b: EmergencyPlanItem) {
  if (a.priority === b.priority) {
    return 0;
  }

  return a.priority === "essential" ? -1 : 1;
}

function isEssential(item: ScheduledItem) {
  const normalizedTitle = normalizeText(item.title);
  return ESSENTIAL_KEYWORDS.some((keyword) => normalizedTitle.includes(keyword));
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

function parseIsoDate(value: string) {
  return new Date(`${value}T12:00:00`);
}
