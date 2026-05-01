import type {
  Account,
  Category,
  Payee,
  ScheduledItem,
  Transaction,
  Workspace
} from "@/lib/domain";

export const workspace: Workspace = {
  id: "main",
  name: "Deniaros Global",
  type: "personal",
  baseCurrency: "BRL",
  locale: "pt-BR",
  timeZone: "America/Fortaleza",
  countryCode: "BR"
};

export const accounts: Account[] = [
  {
    id: "wallet",
    name: "Carteira física",
    type: "cash",
    openingBalance: 845.92,
    currency: "BRL",
    color: "emerald"
  },
  {
    id: "driver",
    name: "Uber Driver",
    type: "checking",
    openingBalance: 1120.4,
    currency: "BRL",
    color: "blue"
  },
  {
    id: "business",
    name: "Mercadinho SLZ",
    type: "business",
    openingBalance: 2650,
    currency: "BRL",
    color: "gold"
  },
  {
    id: "reserve",
    name: "Reserva",
    type: "savings",
    openingBalance: 540,
    currency: "BRL",
    color: "violet"
  }
];

export const categories: Category[] = [
  { id: "income", name: "Renda", kind: "income" },
  { id: "income-labor", name: "Pro-labore", kind: "income", parentId: "income" },
  { id: "income-sales", name: "Vendas", kind: "income", parentId: "income" },
  { id: "transport", name: "Transporte", kind: "expense" },
  {
    id: "transport-fuel",
    name: "Combustível",
    kind: "expense",
    parentId: "transport"
  },
  { id: "food", name: "Alimentação", kind: "expense" },
  { id: "food-market", name: "Mercado", kind: "expense", parentId: "food" },
  {
    id: "food-restaurant",
    name: "Restaurantes",
    kind: "expense",
    parentId: "food"
  },
  { id: "loan", name: "Emprestimo", kind: "expense" },
  {
    id: "loan-third-party",
    name: "Terceiros",
    kind: "expense",
    parentId: "loan"
  },
  { id: "reserve-parent", name: "Reserva", kind: "expense" },
  {
    id: "reserve",
    name: "Reserva financeira",
    kind: "expense",
    parentId: "reserve-parent"
  }
];

export const payees: Payee[] = [
  { id: "werbet", name: "Werbet da Costa Alves", type: "person" },
  { id: "ramiro", name: "Ramiro Alves Filho", type: "person" },
  { id: "market", name: "Mercadinho SLZ", type: "company" },
  { id: "station", name: "Posto de combustível", type: "place" },
  { id: "energy", name: "Conta de energia", type: "company" }
];

export const transactions: Transaction[] = [
  {
    id: "tx-001",
    accountId: "wallet",
    transferAccountId: "driver",
    payeeId: "werbet",
    description: "Transferência entre contas",
    amount: -14.24,
    currency: "BRL",
    date: "2026-04-24",
    status: "posted",
    source: "manual"
  },
  {
    id: "tx-002",
    accountId: "wallet",
    categoryId: "transport-fuel",
    payeeId: "station",
    description: "Abastecimento do carro",
    amount: -50,
    currency: "BRL",
    date: "2026-04-24",
    status: "posted",
    source: "manual"
  },
  {
    id: "tx-003",
    accountId: "wallet",
    categoryId: "food-restaurant",
    description: "Compra de jántar",
    amount: -20,
    currency: "BRL",
    date: "2026-04-23",
    status: "posted",
    source: "manual"
  },
  {
    id: "tx-004",
    accountId: "business",
    categoryId: "income-labor",
    payeeId: "market",
    description: "Retirada para gastos de casa",
    amount: -120,
    currency: "BRL",
    date: "2026-04-22",
    status: "posted",
    source: "manual"
  },
  {
    id: "tx-005",
    accountId: "wallet",
    categoryId: "income-labor",
    payeeId: "market",
    description: "Entrada retirada do negócio",
    amount: 120,
    currency: "BRL",
    date: "2026-04-22",
    status: "posted",
    source: "manual"
  }
];

export const scheduledItems: ScheduledItem[] = [
  {
    id: "sch-001",
    kind: "bill",
    accountId: "wallet",
    categoryId: "transport-fuel",
    payeeId: "energy",
    title: "Conta de energia",
    amount: -118.4,
    currency: "BRL",
    dueDate: "2026-04-26",
    recurrence: "monthly",
    status: "due-soon"
  },
  {
    id: "sch-002",
    kind: "deposit",
    accountId: "driver",
    categoryId: "income-labor",
    payeeId: "werbet",
    title: "Repasse Uber Driver",
    amount: 1220,
    currency: "BRL",
    dueDate: "2026-04-29",
    recurrence: "weekly",
    status: "scheduled"
  },
  {
    id: "sch-003",
    kind: "saving",
    accountId: "reserve",
    categoryId: "reserve",
    title: "Reserva semanal",
    amount: -150,
    currency: "BRL",
    dueDate: "2026-04-30",
    recurrence: "weekly",
    status: "scheduled"
  },
  {
    id: "sch-004",
    kind: "bill",
    accountId: "wallet",
    categoryId: "loan-third-party",
    payeeId: "ramiro",
    title: "Pagamento de emprestimo",
    amount: -260,
    currency: "BRL",
    dueDate: "2026-05-02",
    recurrence: "once",
    status: "scheduled"
  }
];
