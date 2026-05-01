export type NavigationItem = {
  description: string;
  href: string;
  icon:
    | "home"
    | "wallet"
    | "bills"
    | "investments"
    | "planner"
    | "reports"
    | "assistant"
    | "decisions"
    | "web"
    | "support"
    | "admin"
    | "settings";
  adminOnly?: boolean;
  id: string;
  isWindowsOnly?: boolean;
  label: string;
  order: number;
  shortLabel?: string;
};

export const navigation: NavigationItem[] = [
  {
    id: "home",
    icon: "home",
    order: 1,
    label: "Início",
    href: "/",
    description: "Resumo do caixa, agenda e próximas decisões."
  },
  {
    id: "wallets",
    icon: "wallet",
    order: 2,
    label: "Carteiras",
    href: "/accounts",
    description: "Contas, saldos e movimentos por carteira."
  },
  {
    id: "bills",
    icon: "bills",
    order: 3,
    label: "Contas a Pagar & Receber",
    shortLabel: "Agenda",
    href: "/financial-agenda",
    description: "Compromissos, depósitos, calendário e previsão de saldo."
  },
  {
    id: "investments",
    icon: "investments",
    order: 4,
    label: "Investimentos",
    href: "/investments",
    description: "Acompanhamento do patrimônio investido."
  },
  {
    id: "planner",
    icon: "planner",
    order: 5,
    label: "Planejador",
    href: "/planner",
    description: "Orçamento, redução de débitos e metas financeiras."
  },
  {
    id: "reports",
    icon: "reports",
    order: 6,
    label: "Relatórios",
    href: "/reports",
    description: "Gráficos e leituras sobre hábitos, contas e orçamento."
  },
  {
    id: "assistant",
    icon: "assistant",
    order: 7,
    label: "Consultor IA",
    href: "/assistant",
    description: "Conversa natural sobre seus saldos, gastos, contas e previsão."
  },
  {
    id: "decisions",
    icon: "decisions",
    order: 8,
    label: "Decisões",
    href: "/decisions",
    description: "Análises guiadas para decisões financeiras."
  },
  {
    id: "web",
    icon: "web",
    order: 9,
    label: "Web",
    href: "/web",
    isWindowsOnly: true,
    description: "Ponte para recursos web e Windows."
  },
  {
    id: "support",
    icon: "support",
    order: 10,
    label: "Chat e Suporte",
    href: "/support",
    description: "Triagem, tickets e acompanhamento de atendimento."
  },
  {
    id: "settings",
    icon: "settings",
    order: 11,
    label: "Configurações",
    href: "/settings",
    description: "Perfil, categorias, segurança e preferências."
  },
  {
    id: "admin",
    icon: "admin",
    order: 12,
    label: "Admin SaaS",
    href: "/admin",
    adminOnly: true,
    description: "Gestão de assinantes, planos, suporte e permissões."
  }
];
