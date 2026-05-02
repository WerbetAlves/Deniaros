"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { SupportTopic } from "@/lib/support";

type SupportAiAssistantProps = {
  createTicketAction: (formData: FormData) => void | Promise<void>;
  hasGeminiKey: boolean;
  initialQuestion?: string;
  initialTopic: SupportTopic;
  topicLabels: Record<SupportTopic, string>;
};

type AiAdvice = {
  href: string;
  source: "gemini" | "fallback";
  steps: string[];
  summary: string;
  title: string;
};

type TicketDraft = {
  area: string;
  context: string;
  description: string;
  title: string;
};

type SupportAiResponse = {
  advice: AiAdvice;
  ticketDraft: TicketDraft;
};

export function SupportAiAssistant({
  createTicketAction,
  hasGeminiKey,
  initialQuestion = "",
  initialTopic,
  topicLabels
}: SupportAiAssistantProps) {
  const [topic, setTopic] = useState<SupportTopic>(initialTopic);
  const [question, setQuestion] = useState(initialQuestion);
  const [result, setResult] = useState<SupportAiResponse | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const resultRef = useRef<HTMLDivElement | null>(null);
  const topicOptions = useMemo(() => Object.entries(topicLabels) as Array<[SupportTopic, string]>, [topicLabels]);

  useEffect(() => {
    if (!result) {
      return;
    }

    resultRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }, [result]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/support/ai", {
          body: JSON.stringify({ question, topic }),
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST"
        });
        const payload = (await response.json()) as Partial<SupportAiResponse> & {
          error?: string;
        };

        if (!response.ok || !payload.advice || !payload.ticketDraft) {
          setResult(null);
          setError(payload.error ?? "Não consegui gerar uma orientação agora.");
          return;
        }

        setResult({
          advice: payload.advice,
          ticketDraft: payload.ticketDraft
        });
      } catch {
        setResult(null);
        setError("Não consegui falar com a IA agora. Tente novamente em instantes.");
      }
    });
  }

  const sourceLabel =
    result?.advice.source === "gemini"
      ? "Resposta gerada pela IA"
      : hasGeminiKey
        ? "Fallback de suporte"
        : "Fallback sem chave de IA";

  return (
    <section className="support-console panel" id="ai-chat">
      <div className="support-console-main">
        <div>
          <p className="section-label">Inteligência Deniaros</p>
          <h3>Triagem tecnica, sem enrolacao</h3>
          <p>
            Conte o que está tentando fazer. A IA orienta o próximo passo e, se precisar de humano,
            já monta o ticket com contexto.
          </p>
        </div>

        <form className="support-console-form" onSubmit={handleSubmit}>
          <label>
            Área
            <select
              onChange={(event) => setTopic(event.target.value as SupportTopic)}
              value={topic}
            >
              {topicOptions.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="wide-field">
            O que você precisa resolver?
            <textarea
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ex.: baixei uma conta recorrente, mas não entendi onde ela apareceu"
              required
              rows={4}
              value={question}
            />
          </label>

          {error ? <p className="form-error wide-field">{error}</p> : null}

          <div className="support-console-actions">
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? "Pensando..." : "Conversar com IA"}
            </button>
            <a className="ghost-button" href="#ticket-form">
              Abrir ticket manual
            </a>
          </div>
        </form>
      </div>

      <aside className="support-console-side">
        <span className={hasGeminiKey ? "support-ai-orb active" : "support-ai-orb"}>IA</span>
        <strong>{hasGeminiKey ? "IA online" : "IA em fallback"}</strong>
        <p>
          {hasGeminiKey
            ? "A resposta usa Gemini e mantém um caminho seguro para ticket."
            : "Configure GEMINI_API_KEY para ativar resposta generativa."}
        </p>
      </aside>

      {result ? (
        <div className="support-answer" ref={resultRef}>
          <div className="support-answer-copy">
            <p className="section-label">{sourceLabel}</p>
            <h3>{result.advice.title}</h3>
            <p>{result.advice.summary}</p>
          </div>

          <div className="support-answer-steps">
            {result.advice.steps.map((step) => (
              <article key={step}>
                <span />
                <p>{step}</p>
              </article>
            ))}
          </div>

          <div className="support-answer-actions">
            <a className="ghost-button" href={result.advice.href}>
              Ir para área indicada
            </a>
            <form action={createTicketAction}>
              <input name="aiContext" type="hidden" value={result.ticketDraft.context} />
              <input name="area" type="hidden" value={result.ticketDraft.area} />
              <input name="description" type="hidden" value={result.ticketDraft.description} />
              <input name="priority" type="hidden" value="medium" />
              <input name="title" type="hidden" value={result.ticketDraft.title} />
              <button className="primary-button" type="submit">
                Abrir ticket com contexto
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
