import type { FinancialData } from "@/lib/financial-data";
import {
  buildForecastProjection,
  formatCurrency,
  getAccountBalances,
  getPostedExpenses,
  getPostedIncome,
  getTotalBalance
} from "@/lib/finance";

type AssistantMessage = {
  role: "assistant" | "user";
  content: string;
};

type AssistantOptions = {
  allowFinancialContext: boolean;
  data: FinancialData;
  history: AssistantMessage[];
  message: string;
};

type AssistantReply = {
  answer: string;
  fallbackReason?: string;
  source: "fallback" | "gemini";
};

type AssistantAction = {
  href: string;
  priority: "alta" | "media" | "baixa";
  reason: string;
  title: string;
};

type AssistantDiagnosis = {
  accountsCount: number;
  currency: string;
  dueSoonCount: number;
  endingBalance: number;
  firstNegativeDate?: string;
  last30Expenses: number;
  last30Income: number;
  lowestBalance: number;
  lowestDate: string;
  monthlyMargin: number;
  nextDueItem?: string;
  overdueCount: number;
  recommendedActions: AssistantAction[];
  riskLevel: "stable" | "attention" | "danger";
  source: FinancialData["source"];
  topExpenses: string[];
  totalBalance: number;
  workspaceName: string;
};

export async function getFinancialAssistantReply({
  allowFinancialContext,
  data,
  history,
  message
}: AssistantOptions) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const diagnosis = allowFinancialContext ? buildFinancialAssistantDiagnosis(data) : undefined;
  const context = diagnosis ? buildFinancialAssistantContext(data, diagnosis) : "";

  if (!apiKey) {
    return buildFinancialAssistantFallback({
      allowFinancialContext,
      diagnosis,
      message,
      reason: "missing_api_key"
    });
  }

  const model = process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: buildFinancialAssistantPrompt({
                    allowFinancialContext,
                    context,
                    history,
                    message
                  })
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.45
          }
        }),
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        method: "POST"
      }
    );

    if (!response.ok) {
      console.warn("[assistant-ai] Gemini fallback", {
        reason: "gemini_http_error",
        status: response.status
      });

      return buildFinancialAssistantFallback({
        allowFinancialContext,
        diagnosis,
        message,
        reason: `gemini_http_${response.status}`
      });
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };
    const answer = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!answer) {
      console.warn("[assistant-ai] Gemini fallback", {
        reason: "empty_response"
      });

      return buildFinancialAssistantFallback({
        allowFinancialContext,
        diagnosis,
        message,
        reason: "empty_response"
      });
    }

    return {
      answer,
      source: "gemini"
    } satisfies AssistantReply;
  } catch (error) {
    console.warn("[assistant-ai] Gemini fallback", {
      message: error instanceof Error ? error.message : "unknown_error",
      reason: "exception"
    });

    return buildFinancialAssistantFallback({
      allowFinancialContext,
      diagnosis,
      message,
      reason: "exception"
    });
  }
}

export function buildFinancialAssistantContext(
  data: FinancialData,
  diagnosis = buildFinancialAssistantDiagnosis(data)
) {
  if (data.source === "unavailable") {
    return [
      `Workspace: ${diagnosis.workspaceName}; fonte unavailable.`,
      "Dados reais indisponiveis nesta requisicao. Nao invente numeros.",
      "Oriente o usuario a revisar login, workspace ou suporte, e ainda ofereca ajuda geral."
    ].join("\n");
  }

  const { accounts, categories, payees, scheduledItems, transactions, workspace } = data;
  const locale = workspace.locale;
  const currency = workspace.baseCurrency;
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const payeeById = new Map(payees.map((payee) => [payee.id, payee]));
  const balances = getAccountBalances(accounts, transactions);
  const totalBalance = getTotalBalance(balances);
  const today = new Date();
  const last30 = filterByDays(transactions, today, 30);
  const last90 = filterByDays(transactions, today, 90);
  const forecast = buildForecastProjection({
    currentBalance: totalBalance,
    horizonDays: 90,
    scheduledItems,
    today
  });
  const topExpenses = buildTopExpenseCategories(last90, categoryById, locale, currency);
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map((transaction) => {
      const account = accountById.get(transaction.accountId)?.name ?? "Conta";
      const category = transaction.categoryId
        ? categoryById.get(transaction.categoryId)?.name ?? "Sem categoria"
        : "Sem categoria";
      const payee = transaction.payeeId ? payeeById.get(transaction.payeeId)?.name : undefined;
      const amount = formatCurrency(transaction.amount, transaction.currency, locale);

      return `${transaction.date}: ${amount} em ${account}; categoria ${category}; ${payee ? `favorecido ${payee}; ` : ""}${transaction.description}`;
    });
  const upcomingItems = [...scheduledItems]
    .filter((item) => item.status !== "paid")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8)
    .map((item) => `${item.dueDate}: ${item.title}, ${formatCurrency(item.amount, item.currency, locale)}, ${item.status}`);

  return [
    `Workspace: ${workspace.name}; moeda base ${currency}; fonte ${data.source}.`,
    `Saldo consolidado atual: ${formatCurrency(totalBalance, currency, locale)}.`,
    `Entradas realizadas nos ultimos 30 dias: ${formatCurrency(getPostedIncome(last30), currency, locale)}.`,
    `Saidas realizadas nos ultimos 30 dias: ${formatCurrency(getPostedExpenses(last30), currency, locale)}.`,
    `Previsao em 90 dias: saldo final ${formatCurrency(forecast.summary.endingBalance, currency, locale)}; menor saldo ${formatCurrency(forecast.summary.lowestBalance, currency, locale)} em ${forecast.summary.lowestDate}; risco ${forecast.summary.riskLevel}.`,
    `Diagnostico acionavel: margem mensal ${formatCurrency(diagnosis.monthlyMargin, currency, locale)}; contas vencidas ${diagnosis.overdueCount}; vencem em breve ${diagnosis.dueSoonCount}; proxima ocorrencia ${diagnosis.nextDueItem ?? "nenhuma"}.`,
    `Proxima melhor acao: ${diagnosis.recommendedActions[0]?.title ?? "Revisar Centro de Decisoes"} - ${diagnosis.recommendedActions[0]?.reason ?? "manter rotina financeira ativa"}.`,
    `Onde agir no Deniaros: agenda /financial-agenda; decisoes /decisions; planejador de dividas /planner?view=debts; relatorios /reports; novo movimento /transactions/new.`,
    `Contas ativas: ${balances
      .map((account) => `${account.name}: ${formatCurrency(account.currentBalance, account.currency, locale)}`)
      .join(" | ") || "nenhuma"}.`,
    `Maiores saidas por categoria nos ultimos 90 dias: ${topExpenses.join(" | ") || "sem despesas classificadas"}.`,
    `Proximos compromissos: ${upcomingItems.join(" | ") || "nenhum compromisso aberto"}.`,
    `Movimentos recentes: ${recentTransactions.join(" | ") || "nenhum movimento recente"}.`
  ].join("\n");
}

export function buildFinancialAssistantDiagnosis(data: FinancialData): AssistantDiagnosis {
  const { accounts, categories, scheduledItems, transactions, workspace } = data;
  const locale = workspace.locale;
  const currency = workspace.baseCurrency;
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const balances = getAccountBalances(accounts, transactions);
  const totalBalance = getTotalBalance(balances);
  const today = new Date();
  const todayIso = toIsoDate(today);
  const dueSoonLimitIso = toIsoDate(addDays(today, 7));
  const last30 = filterByDays(transactions, today, 30);
  const last90 = filterByDays(transactions, today, 90);
  const last30Income = getPostedIncome(last30);
  const last30Expenses = getPostedExpenses(last30);
  const forecast = buildForecastProjection({
    currentBalance: totalBalance,
    horizonDays: 90,
    scheduledItems,
    today
  });
  const openItems = scheduledItems
    .filter((item) => item.status !== "paid")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdueCount = openItems.filter(
    (item) => item.status === "overdue" || item.dueDate < todayIso
  ).length;
  const dueSoonCount = openItems.filter(
    (item) => item.dueDate >= todayIso && item.dueDate <= dueSoonLimitIso
  ).length;
  const topExpenses = buildTopExpenseCategories(last90, categoryById, locale, currency);
  const nextDueItem = openItems[0]
    ? `${openItems[0].title} em ${openItems[0].dueDate} (${formatCurrency(
        openItems[0].amount,
        openItems[0].currency,
        locale
      )})`
    : undefined;

  const diagnosis: Omit<AssistantDiagnosis, "recommendedActions"> = {
    accountsCount: accounts.length,
    currency,
    dueSoonCount,
    endingBalance: forecast.summary.endingBalance,
    firstNegativeDate: forecast.summary.firstNegativeDate,
    last30Expenses,
    last30Income,
    lowestBalance: forecast.summary.lowestBalance,
    lowestDate: forecast.summary.lowestDate,
    monthlyMargin: last30Income - last30Expenses,
    nextDueItem,
    overdueCount,
    riskLevel: forecast.summary.riskLevel,
    source: data.source,
    topExpenses,
    totalBalance,
    workspaceName: workspace.name
  };

  return {
    ...diagnosis,
    recommendedActions: buildRecommendedActions(diagnosis)
  };
}

function buildFinancialAssistantPrompt({
  allowFinancialContext,
  context,
  history,
  message
}: {
  allowFinancialContext: boolean;
  context: string;
  history: AssistantMessage[];
  message: string;
}) {
  return [
    "Voce e o Consultor IA do Deniaros, um SaaS brasileiro de gestao financeira pessoal inspirado no Money 99.",
    "Converse de forma natural, como um chat, sem parecer funil de suporte.",
    "Use portugues do Brasil, tom humano, pratico e direto.",
    "Ajude o usuario a olhar passado, entender o presente e projetar o futuro.",
    "Quando a pergunta pedir diagnostico, responda com: Leitura rapida, Por que importa, Proximos passos e Onde agir no Deniaros.",
    "Quando a pergunta for casual, responda naturalmente e mantenha a resposta leve.",
    "Sempre que possivel, transforme a analise em 1 a 3 proximos passos concretos.",
    "Nao prometa executar acoes, nao diga que transferiu dinheiro, pagou contas, alterou dados ou enviou mensagens.",
    "Nao de consultoria financeira regulada como certeza. Trate recomendacoes como orientacao educativa baseada nos dados visiveis.",
    "Se faltar dado, pergunte de forma simples. Se houver risco de caixa, seja claro e cuidadoso.",
    allowFinancialContext
      ? "Use o contexto financeiro resumido abaixo como fonte principal."
      : "O usuario desligou o contexto financeiro. Responda sem usar dados financeiros do workspace.",
    context ? `Contexto financeiro resumido:\n${context}` : "",
    buildHistoryBlock(history),
    `Mensagem atual do usuario: ${message}`
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildHistoryBlock(history: AssistantMessage[]) {
  const relevantHistory = history.slice(-8);

  if (!relevantHistory.length) {
    return "";
  }

  return [
    "Historico recente da conversa:",
    ...relevantHistory.map((item) => `${item.role === "user" ? "Usuario" : "Consultor IA"}: ${item.content}`)
  ].join("\n");
}

function buildFinancialAssistantFallback({
  allowFinancialContext,
  diagnosis,
  message,
  reason
}: {
  allowFinancialContext: boolean;
  diagnosis?: AssistantDiagnosis;
  message: string;
  reason: string;
}): AssistantReply {
  if (!allowFinancialContext) {
    return {
      answer: [
        "Consigo conversar com voce de forma livre, mas o contexto financeiro esta desligado nesta mensagem.",
        "Ative o contexto resumido para eu comparar saldo, contas, gastos, previsao e movimentos recentes com mais precisao."
      ].join("\n\n"),
      fallbackReason: reason,
      source: "fallback"
    };
  }

  if (!diagnosis || diagnosis.source === "unavailable") {
    return {
      answer: [
        "Estou em modo local agora e os dados reais nao carregaram nesta sessao.",
        "Leitura rapida: nao vou inventar saldo ou movimentos. Para uma analise financeira confiavel, preciso que o workspace carregue os dados reais.",
        "Proximos passos: entre novamente, confira se o workspace correto esta ativo e, se persistir, abra suporte com o contexto da tela.",
        `Sobre sua pergunta: "${message}". Posso te orientar de forma geral enquanto os dados nao voltam.`
      ].join("\n\n"),
      fallbackReason: reason,
      source: "fallback"
    };
  }

  const primaryAction = diagnosis.recommendedActions[0];
  const riskLabel =
    diagnosis.riskLevel === "danger"
      ? "risco alto"
      : diagnosis.riskLevel === "attention"
        ? "ponto de atencao"
        : "sob controle";

  return {
    answer: [
      "Estou em modo local agora, mas consigo fazer uma leitura objetiva com o resumo do Deniaros.",
      `Leitura rapida: seu caixa esta ${riskLabel}. Saldo atual: ${formatCurrency(
        diagnosis.totalBalance,
        diagnosis.currency
      )}. Menor saldo previsto em 90 dias: ${formatCurrency(
        diagnosis.lowestBalance,
        diagnosis.currency
      )} em ${diagnosis.lowestDate}.`,
      `Por que importa: sua margem dos ultimos 30 dias foi ${formatCurrency(
        diagnosis.monthlyMargin,
        diagnosis.currency
      )}. Ha ${diagnosis.overdueCount} compromisso(s) vencido(s) e ${diagnosis.dueSoonCount} vencendo nos proximos 7 dias.`,
      `Proximo passo: ${primaryAction.title}. ${primaryAction.reason}.`,
      `Onde agir no Deniaros: ${primaryAction.href}. Para aprofundar, use Agenda, Centro de Decisoes e Relatorios.`,
      `Sobre sua pergunta: "${message}". Se quiser, eu tambem consigo separar isso por saldo, contas proximas, gastos por categoria ou previsao de caixa.`
    ].join("\n\n"),
    fallbackReason: reason,
    source: "fallback"
  };
}

function buildRecommendedActions(
  diagnosis: Omit<AssistantDiagnosis, "recommendedActions">
): AssistantAction[] {
  if (diagnosis.source === "unavailable") {
    return [
      {
        href: "/support",
        priority: "alta",
        reason: "os dados reais nao carregaram nesta sessao",
        title: "Revisar conexao dos dados"
      }
    ];
  }

  const actions: AssistantAction[] = [];

  if (diagnosis.overdueCount > 0 || diagnosis.riskLevel === "danger") {
    actions.push({
      href: "/financial-agenda",
      priority: "alta",
      reason:
        diagnosis.overdueCount > 0
          ? `${diagnosis.overdueCount} compromisso(s) vencido(s) precisam de decisao`
          : `a previsao cruza saldo negativo em ${diagnosis.firstNegativeDate ?? diagnosis.lowestDate}`,
      title: "Resolver a agenda de caixa"
    });
  }

  if (diagnosis.monthlyMargin < 0) {
    actions.push({
      href: "/decisions",
      priority: "alta",
      reason: "as saidas dos ultimos 30 dias superaram as entradas",
      title: "Simular corte ou reorganizacao"
    });
  }

  if (diagnosis.dueSoonCount > 0) {
    actions.push({
      href: "/financial-agenda",
      priority: "media",
      reason: `${diagnosis.dueSoonCount} compromisso(s) vencem nos proximos 7 dias`,
      title: "Antecipar proximos vencimentos"
    });
  }

  if (diagnosis.topExpenses.length > 0) {
    actions.push({
      href: "/reports?section=habits&report=where-money-goes",
      priority: "media",
      reason: `maior pressao recente: ${diagnosis.topExpenses[0]}`,
      title: "Entender o maior vazamento"
    });
  }

  if (diagnosis.accountsCount === 0) {
    actions.push({
      href: "/accounts",
      priority: "alta",
      reason: "sem contas cadastradas nao ha base confiavel para previsao",
      title: "Cadastrar a primeira carteira"
    });
  }

  actions.push({
    href: "/planner?view=debts",
    priority: "baixa",
    reason: "transformar contas e dividas em plano reduz o risco de decidir no escuro",
    title: "Revisar plano de dividas"
  });

  return actions.slice(0, 4);
}

function filterByDays<T extends { date: string }>(items: T[], today: Date, days: number) {
  const start = new Date(today);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  return items.filter((item) => new Date(`${item.date}T12:00:00`) >= start);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  nextDate.setHours(12, 0, 0, 0);
  return nextDate;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildTopExpenseCategories(
  transactions: FinancialData["transactions"],
  categoryById: Map<string, { name: string }>,
  locale: string,
  currency: string
) {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.status !== "posted" || transaction.amount >= 0 || transaction.transferAccountId) {
      continue;
    }

    const categoryName = transaction.categoryId
      ? categoryById.get(transaction.categoryId)?.name ?? "Sem categoria"
      : "Sem categoria";
    totals.set(categoryName, (totals.get(categoryName) ?? 0) + Math.abs(transaction.amount));
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, total]) => `${category}: ${formatCurrency(total, currency, locale)}`);
}
