import {
  getTriageAdvice,
  supportTopicLabels,
  type SupportTopic
} from "@/lib/support";

type SupportAdvice = ReturnType<typeof getTriageAdvice> & {
  source: "gemini" | "fallback";
};

const allowedSupportPaths: Record<SupportTopic, string> = {
  access: "/settings?area=account",
  billing: "/billing",
  bug: "/support",
  launch: "/financial-agenda",
  open_finance: "/accounts",
  reports: "/reports"
};

export async function getSupportAiAdvice(
  topic: SupportTopic,
  question: string
): Promise<SupportAdvice> {
  const fallback = {
    ...getTriageAdvice(topic, question),
    source: "fallback" as const
  };
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return fallback;
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
                  text: buildSupportPrompt(topic, question)
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.35
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
      return fallback;
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
    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = parseAdviceJson(rawText);

    if (!parsed) {
      return fallback;
    }

    return {
      href: allowedSupportPaths[topic],
      source: "gemini",
      steps: parsed.steps,
      summary: parsed.summary,
      title: parsed.title
    };
  } catch {
    return fallback;
  }
}

function buildSupportPrompt(topic: SupportTopic, question: string) {
  return [
    "Voce e o assistente de suporte do Deniaros, um SaaS brasileiro de gestao financeira pessoal inspirado no Money 99.",
    "Responda em portugues do Brasil, de forma curta, pratica e respeitosa.",
    "A resposta deve orientar o usuario antes de abrir ticket, sem prometer acoes ja executadas.",
    "Nao invente dados da conta do usuario. Se precisar de dados internos, diga quais informacoes ele deve confirmar.",
    "O usuario ja esta autenticado dentro do Deniaros quando usa esta tela. Nao diga para fazer login, instalar app, procurar rodape/cabecalho generico ou acessar menus que nao existem.",
    "Use apenas caminhos reais do Deniaros: Chat e Suporte, Tickets de suporte, Abrir ticket manual, Contas a Pagar & Receber, Carteiras, Relatorios, Planejador, Configuracoes, Assinatura & Planos e Admin SaaS quando fizer sentido.",
    "Se o usuario perguntar sobre tickets abertos, oriente a usar a lista Tickets de suporte nesta propria pagina e o filtro Status.",
    "Se o assunto for lancamento ou conta recorrente, diferencie compromisso futuro em Contas a Pagar & Receber de movimento ja realizado em Novo movimento.",
    "Retorne somente JSON valido com este formato:",
    '{"title":"...","summary":"...","steps":["...","...","..."]}',
    `Topico selecionado: ${supportTopicLabels[topic]}.`,
    `Pergunta do usuario: ${question}`
  ].join("\n");
}

function parseAdviceJson(value?: string) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as {
      steps?: unknown;
      summary?: unknown;
      title?: unknown;
    };
    const title = readShortText(parsed.title, 120);
    const summary = readShortText(parsed.summary, 320);
    const steps = Array.isArray(parsed.steps)
      ? parsed.steps
          .map((step) => readShortText(step, 180))
          .filter(Boolean)
          .slice(0, 3)
      : [];

    if (!title || !summary || steps.length < 2) {
      return null;
    }

    return {
      steps,
      summary,
      title
    };
  } catch {
    return null;
  }
}

function readShortText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}
