import { ContextualHelp } from "@/components/contextual-help";
import Link from "next/link";

type QuickStartStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  done: boolean;
};

export function QuickStartGuide({
  subtitle,
  title,
  steps
}: {
  subtitle: string;
  title: string;
  steps: QuickStartStep[];
}) {
  const completed = steps.filter((step) => step.done).length;
  const allDone = completed === steps.length;
  const progress = Math.round((completed / Math.max(steps.length, 1)) * 100);
  const nextStep = steps.find((step) => !step.done);

  if (allDone) {
    return null;
  }

  return (
    <section className="quickstart panel">
      <div className="quickstart-head">
        <div>
          <p className="section-label">Guia de início rápido</p>
          <div className="quickstart-title-row">
            <h3>{title}</h3>
            <ContextualHelp
              aiPrompt="Me ajude a completar a base inicial do Deniaros na ordem correta."
              tooltip={subtitle}
            />
          </div>
        </div>
        <div className="quickstart-progress">
          <p className="section-label">Checklist</p>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <strong>
            {completed} de {steps.length} concluido(s)
          </strong>
        </div>
      </div>

      {nextStep ? (
        <article className="quickstart-next-step">
          <div>
            <p className="section-label">Proxima acao recomendada</p>
            <div className="quickstart-title-row compact">
              <h4>{nextStep.title}</h4>
              <ContextualHelp
                aiPrompt={`Me explique como concluir esta etapa no Deniaros: ${nextStep.title}.`}
                tooltip={nextStep.description}
              />
            </div>
          </div>
          <Link className="primary-button" href={nextStep.href}>
            {nextStep.actionLabel}
          </Link>
        </article>
      ) : null}

      <div className="quickstart-checklist">
        {steps.map((step) => (
          <article className={`quickstart-check-item${step.done ? " completed" : ""}`} key={step.id}>
            <div className="quickstart-check-state" aria-hidden="true">
              {step.done ? "✓" : ""}
            </div>

            <div className="quickstart-check-copy">
              <span>
                <strong>{step.title}</strong>
                <ContextualHelp tooltip={step.description} />
              </span>
            </div>

            <Link className={step.done ? "ghost-button" : "primary-button"} href={step.href}>
              {step.done ? "Revisar" : step.actionLabel}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
