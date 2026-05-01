export type TicketStatus = "open" | "waiting" | "resolved" | "closed";
export type TicketPriority = "urgent" | "high" | "medium" | "low";
export type TicketArea = "technical" | "feature" | "billing" | "guidance" | "account";
export type SupportTopic = "launch" | "billing" | "open_finance" | "reports" | "bug" | "access";

export type SupportTicketLike = {
  area: TicketArea | string;
  created_at: string;
  description?: string;
  priority: TicketPriority;
  status: TicketStatus;
  updated_at: string;
};

export const ticketStatusLabels: Record<TicketStatus, string> = {
  closed: "Fechado",
  open: "Aberto",
  resolved: "Resolvido",
  waiting: "Aguardando retorno"
};

export const ticketPriorityLabels: Record<TicketPriority, string> = {
  high: "Alta",
  low: "Baixa",
  medium: "Média",
  urgent: "Urgente"
};

export const ticketAreaLabels: Record<TicketArea, string> = {
  account: "Conta e acesso",
  billing: "Assinatura",
  feature: "Funcionalidade",
  guidance: "Orientação de uso",
  technical: "Técnico"
};

export const supportTopicLabels: Record<SupportTopic, string> = {
  access: "Conta e acesso",
  billing: "Planos e assinatura",
  bug: "Erro técnico",
  launch: "Lançamentos e contas",
  open_finance: "Open Finance",
  reports: "Relatórios e planejadores"
};

export const supportTopicToArea: Record<SupportTopic, TicketArea> = {
  access: "account",
  billing: "billing",
  bug: "technical",
  launch: "guidance",
  open_finance: "technical",
  reports: "guidance"
};

const prioritySlaHours: Record<TicketPriority, number> = {
  high: 12,
  low: 48,
  medium: 24,
  urgent: 4
};

const priorityScore: Record<TicketPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1
};

export function normalizeTicketStatus(value?: string): TicketStatus | "all" {
  if (value === "open" || value === "waiting" || value === "resolved" || value === "closed") {
    return value;
  }

  return "all";
}

export function normalizeSupportTopic(value?: string): SupportTopic {
  if (
    value === "access" ||
    value === "billing" ||
    value === "bug" ||
    value === "launch" ||
    value === "open_finance" ||
    value === "reports"
  ) {
    return value;
  }

  return "launch";
}

export function translateTicketArea(area: string) {
  return ticketAreaLabels[area as TicketArea] ?? area;
}

export function translateTicketPriority(priority: TicketPriority) {
  return ticketPriorityLabels[priority];
}

export function translateTicketStatus(status: TicketStatus) {
  return ticketStatusLabels[status];
}

export function getTicketStatusClass(status: TicketStatus) {
  if (status === "resolved" || status === "closed") {
    return "status-stable";
  }
  if (status === "waiting") {
    return "status-info";
  }
  return "status-risk";
}

export function getTicketSla(ticket: SupportTicketLike, now = new Date()) {
  const targetHours = prioritySlaHours[ticket.priority];
  const start = new Date(ticket.status === "open" ? ticket.created_at : ticket.updated_at);
  const elapsedHours = Math.max(0, (now.getTime() - start.getTime()) / 36e5);
  const remainingHours = Math.ceil(targetHours - elapsedHours);

  if (ticket.status === "resolved" || ticket.status === "closed") {
    return {
      className: "sla-done",
      label: "Concluído",
      meta: "Atendimento encerrado",
      remainingHours: 0,
      targetHours
    };
  }

  if (ticket.status === "waiting") {
    return {
      className: "sla-waiting",
      label: "Com o usuário",
      meta: "Aguardando retorno do solicitante",
      remainingHours,
      targetHours
    };
  }

  if (remainingHours <= 0) {
    return {
      className: "sla-overdue",
      label: "SLA vencido",
      meta: `Responder agora · meta ${targetHours}h`,
      remainingHours,
      targetHours
    };
  }

  if (remainingHours <= Math.max(2, Math.ceil(targetHours * 0.25))) {
    return {
      className: "sla-soon",
      label: `Responder em ${remainingHours}h`,
      meta: `Próximo do limite · meta ${targetHours}h`,
      remainingHours,
      targetHours
    };
  }

  return {
    className: "sla-ok",
    label: `Dentro do prazo`,
    meta: `${remainingHours}h restantes · meta ${targetHours}h`,
    remainingHours,
    targetHours
  };
}

export function sortTicketsByAttention<T extends SupportTicketLike>(tickets: T[]) {
  return [...tickets].sort((a, b) => {
    const aSla = getTicketSla(a);
    const bSla = getTicketSla(b);
    const aOverdue = aSla.remainingHours <= 0 && a.status === "open" ? 1 : 0;
    const bOverdue = bSla.remainingHours <= 0 && b.status === "open" ? 1 : 0;

    if (aOverdue !== bOverdue) {
      return bOverdue - aOverdue;
    }

    const priorityDiff = priorityScore[b.priority] - priorityScore[a.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export function parseSupportDescription(description: string) {
  const [message, ...contextParts] = description.split(/\n---\n/);
  const context = contextParts.join("\n---\n").trim();

  return {
    context,
    message: message.trim()
  };
}

export function getTriageAdvice(topic: SupportTopic, question: string) {
  const base = {
    access: {
      href: "/settings?area=account",
      steps: [
        "Confirme se o e-mail usado no login é o mesmo da assinatura ou do convite.",
        "Revise perfil, sessão e permissões antes de abrir um ticket técnico.",
        "Se o acesso envolver outro usuário, informe o e-mail e o tipo de permissão esperado."
      ],
      summary:
        "Problemas de acesso costumam estar ligados a sessão, convite, papel administrativo ou vínculo com workspace.",
      title: "Vamos revisar conta, sessão e permissão."
    },
    billing: {
      href: "/billing",
      steps: [
        "Abra Planos e assinatura e confirme o plano exibido no topo.",
        "Se quiser trocar de plano, use o próprio pedido de alteração para gerar um ticket de assinatura.",
        "Inclua no ticket se o caso envolve Família, Platinum privado ou cobrança pendente."
      ],
      summary:
        "Assinatura e plano precisam sempre gerar histórico para que o suporte acompanhe mudança, aprovação e cobrança.",
      title: "Vamos tratar como assunto comercial."
    },
    bug: {
      href: "/support",
      steps: [
        "Descreva a tela, o botão acionado e o resultado esperado.",
        "Informe se o problema aconteceu uma vez ou se é repetível.",
        "Se houver mensagem de erro, copie o texto principal para o ticket."
      ],
      summary:
        "Para erro técnico, o melhor ticket é aquele que permite reproduzir o problema sem depender de ida e volta.",
      title: "Vamos registrar o erro com contexto técnico."
    },
    launch: {
      href: "/financial-agenda",
      steps: [
        "Se for conta futura, use Contas a Pagar & Receber para cadastrar vencimento e recorrência.",
        "Se já aconteceu, use Novo movimento para registrar como lançamento.",
        "Confira categoria e conta vinculada para o relatório sair correto."
      ],
      summary:
        "A maior diferença é separar compromisso futuro de movimento já realizado. Isso mantém previsão e histórico corretos.",
      title: "Vamos separar previsão de lançamento real."
    },
    open_finance: {
      href: "/accounts",
      steps: [
        "Confirme se o plano libera Open Finance para o workspace.",
        "Cada usuário precisa autorizar os próprios bancos com consentimento individual.",
        "Se for Plano Família, informe quais usuários devem conectar contas."
      ],
      summary:
        "Open Finance depende de plano, consentimento e vínculo correto entre usuário, banco e workspace.",
      title: "Vamos validar plano e consentimento."
    },
    reports: {
      href: "/reports",
      steps: [
        "Confira se contas e categorias estão preenchidas nos lançamentos.",
        "Abra Relatórios para identificar se o problema é filtro, período ou classificação.",
        "Se o relatório parecer incorreto, informe qual gráfico e qual valor você esperava ver."
      ],
      summary:
        "Relatórios bons dependem de lançamentos bem classificados. O suporte precisa saber período, categoria e conta afetada.",
      title: "Vamos revisar dados antes do gráfico."
    }
  } satisfies Record<SupportTopic, { href: string; steps: string[]; summary: string; title: string }>;

  const advice = base[topic];
  return {
    ...advice,
    summary: `${advice.summary} Pelo que você descreveu: "${question}".`
  };
}

export function buildTicketDraft(
  topic: SupportTopic,
  question: string,
  advice: ReturnType<typeof getTriageAdvice>
) {
  return {
    area: supportTopicToArea[topic],
    context: [
      `Triagem Deniaros AI: ${supportTopicLabels[topic]}`,
      `Pergunta do usuário: ${question}`,
      `Orientação exibida: ${advice.title}`,
      `Próximo caminho sugerido: ${advice.href}`
    ].join("\n"),
    description: [
      `Contexto da triagem: ${supportTopicLabels[topic]}.`,
      `O que eu preciso resolver: ${question}`,
      "",
      "O que já tentei / detalhes adicionais:"
    ].join("\n"),
    title: `${supportTopicLabels[topic]}: ${question.slice(0, 58)}`
  };
}

export function getSupportResponseSuggestions(area: TicketArea | string) {
  const base = {
    account: [
      "Confirmei seu acesso e vou revisar vínculo de workspace, convite e permissões para localizar onde a liberação travou.",
      "Para seguir com segurança, preciso confirmar o e-mail do usuário afetado e qual acesso ele deveria ter."
    ],
    billing: [
      "Vou revisar seu plano, status da assinatura e histórico de alteração antes de qualquer mudança de cobrança.",
      "Se a solicitação envolver Plano Família ou Platinum privado, vou registrar a liberação como alteração manual auditada."
    ],
    feature: [
      "Entendi a necessidade. Vou avaliar se isso é ajuste de fluxo, melhoria de usabilidade ou nova funcionalidade.",
      "Vou registrar o caso com impacto, tela afetada e comportamento esperado para priorização no roadmap."
    ],
    guidance: [
      "Vou te orientar pelo caminho mais simples e deixar o passo a passo aqui para você conseguir repetir depois.",
      "Antes de tratar como erro, vou conferir se o lançamento, categoria, conta e período estão alinhados."
    ],
    technical: [
      "Vou tentar reproduzir o erro com a tela, ação e resultado esperado que você informou.",
      "Se houver mensagem de erro, print ou horário aproximado, envie aqui para eu fechar o diagnóstico com mais precisão."
    ]
  } satisfies Record<TicketArea, string[]>;

  return base[area as TicketArea] ?? base.technical;
}
