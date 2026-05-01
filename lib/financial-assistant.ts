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

export async function getFinancialAssistantReply({
  allowFinancialContext,
  data,
  history,
  message
}: AssistantOptions) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const context = allowFinancialContext ? buildFinancialAssistantContext(data) : "";

  if (!apiKey) {
    return buildFinancialAssistantFallback({
      allowFinancialContext,
      context,
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
        context,
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
        context,
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
      context,
      message,
      reason: "exception"
    });
  }
}

export function buildFinancialAssistantContext(data: FinancialData) {
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
    .slice(0, 10)
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
    .slice(0, 10)
    .map((item) => `${item.dueDate}: ${item.title}, ${formatCurrency(item.amount, item.currency, locale)}, ${item.status}`);

  return [
    `Workspace: ${workspace.name}; moeda base ${currency}; fonte ${data.source}.`,
    `Saldo consolidado atual: ${formatCurrency(totalBalance, currency, locale)}.`,
    `Entradas realizadas nos ultimos 30 dias: ${formatCurrency(getPostedIncome(last30), currency, locale)}.`,
    `Saidas realizadas nos ultimos 30 dias: ${formatCurrency(getPostedExpenses(last30), currency, locale)}.`,
    `Previsao em 90 dias: saldo final ${formatCurrency(forecast.summary.endingBalance, currency, locale)}; menor saldo ${formatCurrency(forecast.summary.lowestBalance, currency, locale)} em ${forecast.summary.lowestDate}; risco ${forecast.summary.riskLevel}.`,
    `Contas ativas: ${balances
      .map((account) => `${account.name}: ${formatCurrency(account.currentBalance, account.currency, locale)}`)
      .join(" | ") || "nenhuma"}.`,
    `Maiores saidas por categoria nos ultimos 90 dias: ${topExpenses.join(" | ") || "sem despesas classificadas"}.`,
    `Proximos compromissos: ${upcomingItems.join(" | ") || "nenhum compromisso aberto"}.`,
    `Movimentos recentes: ${recentTransactions.join(" | ") || "nenhum movimento recente"}.`
  ].join("\n");
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
    "Voce pode explicar, comparar, resumir e sugerir proximos passos dentro do Deniaros.",
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
  context,
  message,
  reason
}: {
  allowFinancialContext: boolean;
  context: string;
  message: string;
  reason: string;
}): AssistantReply {
  if (!allowFinancialContext) {
    return {
      answer: [
        "Consigo conversar com você de forma livre, mas o contexto financeiro está desligado nesta mensagem.",
        "Ative o contexto resumido para eu comparar saldo, contas, gastos, previsão e movimentos recentes com mais precisão."
      ].join("\n\n"),
      fallbackReason: reason,
      source: "fallback"
    };
  }

  return {
    answer: [
      "Consegui usar o resumo financeiro local, mas a resposta generativa não veio agora.",
      context,
      `Sobre o que você perguntou: "${message}". Posso separar isso em saldo, contas próximas, gastos por categoria ou previsão de caixa.`
    ].join("\n\n"),
    fallbackReason: reason,
    source: "fallback"
  };
}

function filterByDays<T extends { date: string }>(items: T[], today: Date, days: number) {
  const start = new Date(today);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  return items.filter((item) => new Date(`${item.date}T12:00:00`) >= start);
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
