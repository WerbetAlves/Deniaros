"use client";

import { useEffect, useState } from "react";

const onboardingStages = [
  {
    id: "clarity",
    title: "Clareza do seu dinheiro em minutos",
    description:
      "Entenda saldo real, compromissos e movimentações sem navegar em telas confusas."
  },
  {
    id: "planning",
    title: "Planejámento com contexto pessoal",
    description:
      "Seu perfil financeiro ajusta metas, prioridades e linguagem para seu momento de vida."
  },
  {
    id: "decisions",
    title: "Decisão com previsão e apoio de IA",
    description:
      "Receba alertas mais inteligentes e organize seus próximos passos antes do aperto."
  }
];

export function FirstAccessShowcase({ viewerKey }: { viewerKey?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!viewerKey) {
      return;
    }

    const storageKey = getStorageKey(viewerKey);
    const alreadySeen = window.localStorage.getItem(storageKey);

    if (!alreadySeen) {
      setVisible(true);
    }
  }, [viewerKey]);

  if (!viewerKey || !visible) {
    return null;
  }

  const dismiss = () => {
    window.localStorage.setItem(getStorageKey(viewerKey), "1");
    setVisible(false);
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true">
      <div className="onboarding-card">
        <p className="section-label">Bem-vindo ao Deniaros</p>
        <h3>Seu sistema financeiro evoluiu.</h3>
        <p className="supporting-copy">
          Vejá rapidamente o que muda na sua rotina. Se preferir, você pode pular.
        </p>

        <div className="onboarding-stage-list">
          {onboardingStages.map((stage, index) => (
            <article
              className="onboarding-stage"
              key={stage.id}
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <span className="onboarding-stage-index">{index + 1}</span>
              <div>
                <strong>{stage.title}</strong>
                <p>{stage.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="onboarding-actions">
          <button className="ghost-button" onClick={dismiss} type="button">
            Pular
          </button>
          <button className="primary-button" onClick={dismiss} type="button">
            Comecar agora
          </button>
        </div>
      </div>
    </div>
  );
}

function getStorageKey(viewerKey: string) {
  return `deniaros-first-access-showcase:${viewerKey}`;
}
