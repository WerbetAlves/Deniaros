"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type AssistantResponse = {
  answer?: string;
  assistantSource?: "fallback" | "gemini";
  contextSource?: "sample" | "supabase" | "unavailable";
  error?: string;
  fallbackReason?: string;
  usedFinancialContext?: boolean;
};

const starterQuestions = [
  "Como está meu caixa para os próximos 30 dias?",
  "Onde meu dinheiro está vazando mais?",
  "Tenho alguma conta que pode apertar meu saldo?",
  "O que eu deveria revisar hoje?"
];

function translateFallbackReason(reason: string) {
  if (reason === "missing_api_key") {
    return "chave ausente";
  }

  if (reason === "empty_response") {
    return "resposta vazia";
  }

  if (reason === "exception") {
    return "erro de conexão";
  }

  if (reason.startsWith("gemini_http_")) {
    return `Gemini ${reason.replace("gemini_http_", "")}`;
  }

  return reason;
}

function translateContextSource(source: AssistantResponse["contextSource"]) {
  if (source === "supabase") {
    return "Dados reais";
  }

  if (source === "unavailable") {
    return "Dados indisponiveis";
  }

  return "Dados de amostra";
}

export function FinancialAssistantChat({
  hasGeminiKey,
  initialQuestion = ""
}: {
  hasGeminiKey: boolean;
  initialQuestion?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Pode falar comigo como falaria no WhatsApp. Eu olho o resumo do seu Deniaros e te ajudo a entender saldo, contas, gastos, previsão e próximos passos."
    }
  ]);
  const [input, setInput] = useState(initialQuestion);
  const [assistantSource, setAssistantSource] = useState<AssistantResponse["assistantSource"]>();
  const [contextSource, setContextSource] = useState<AssistantResponse["contextSource"]>();
  const [fallbackReason, setFallbackReason] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement | null>(null);
  const history = useMemo(
    () =>
      messages
        .filter((message) => message.id !== "welcome")
        .map(({ content, role }) => ({ content, role })),
    [messages]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isPending]);

  function sendMessage(messageText: string) {
    const cleanMessage = messageText.trim();

    if (!cleanMessage || isPending) {
      return;
    }

    setError("");
    setInput("");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: cleanMessage
    };
    setMessages((current) => [...current, userMessage]);

    startTransition(async () => {
      try {
        const response = await fetch("/api/assistant/chat", {
          body: JSON.stringify({
            history,
            message: cleanMessage
          }),
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST"
        });
        const payload = (await response.json()) as AssistantResponse;

        if (!response.ok || !payload.answer) {
          setError(payload.error ?? "Não consegui responder agora.");
          return;
        }

        setAssistantSource(payload.assistantSource);
        setContextSource(payload.contextSource);
        setFallbackReason(payload.fallbackReason ?? "");
        setMessages((current) => [
          ...current,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: payload.answer ?? ""
          }
        ]);
      } catch {
        setError("Não consegui falar com o Consultor IA agora. Tente novamente em instantes.");
      }
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <section className="assistant-chat-shell panel" aria-label="Conversa com o Consultor IA">
      <div className="assistant-chat-head">
        <div>
          <p className="section-label">Conversa natural</p>
          <h3>Consultor IA</h3>
          <p>
            Pergunte sobre seu dinheiro do jeito que você pensa: contas, saldo,
            orçamento, hábitos e decisões.
          </p>
        </div>
        <div className="assistant-chat-status">
          <span
            className={
              assistantSource === "fallback" || !hasGeminiKey
                ? "status-chip"
                : "status-chip status-positive"
            }
            title={fallbackReason ? `Fallback: ${fallbackReason}` : undefined}
          >
            {assistantSource === "fallback"
              ? "Fallback local"
              : hasGeminiKey
                ? "Gemini online"
                : "Fallback local"}
          </span>
          {contextSource ? (
            <span className="status-chip">
              {translateContextSource(contextSource)}
            </span>
          ) : null}
          {assistantSource === "fallback" && fallbackReason ? (
            <span className="status-chip">
              Motivo: {translateFallbackReason(fallbackReason)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="assistant-chat-body">
        {messages.map((message) => (
          <article className={`assistant-message ${message.role}`} key={message.id}>
            <span>{message.role === "user" ? "Você" : "Deniaros"}</span>
            {message.content.split("\n\n").map((paragraph, idx) => (
              <p key={`${message.id}-p-${idx}`}>{paragraph}</p>
            ))}
          </article>
        ))}
        {isPending ? (
          <article className="assistant-message assistant assistant-thinking">
            <span>Deniaros</span>
            <p>Pensando com seus dados...</p>
          </article>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="assistant-starter-row" aria-label="Perguntas rápidas">
        {starterQuestions.map((question) => (
          <button key={question} onClick={() => sendMessage(question)} type="button">
            {question}
          </button>
        ))}
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <form className="assistant-compose" onSubmit={handleSubmit}>
        <div className="assistant-compose-row">
          <textarea
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ex.: estou gastando demais com mercado ou é impressão?"
            rows={2}
            value={input}
          />
          <button className="primary-button" disabled={isPending} type="submit">
            Enviar
          </button>
        </div>
      </form>
    </section>
  );
}
