"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

type EvolutionChapter = {
  id: string;
  title: string;
  description: string;
  impact: string;
  actionHref: string;
  actionLabel: string;
  done: boolean;
};

export function SetupEvolutionShowcase({
  chapters
}: {
  chapters: EvolutionChapter[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (chapters.length < 2) {
      return;
    }

    const interval = window.setInterval(() => {
      startTransition(() => {
        setActiveIndex((current) => (current + 1) % chapters.length);
      });
    }, 5200);

    return () => {
      window.clearInterval(interval);
    };
  }, [chapters.length]);

  if (!chapters.length) {
    return null;
  }

  const safeActiveIndex = Math.min(activeIndex, chapters.length - 1);
  const activeChapter = chapters[safeActiveIndex];
  const progress = ((safeActiveIndex + 1) / chapters.length) * 100;

  return (
    <section className="setup-evolution panel">
      <div className="setup-evolution-head">
        <div>
          <p className="section-label">Jornada de evolucao</p>
          <h3>Como o Deniaros evolui sua vida financeira</h3>
          <p className="supporting-copy">
            Uma visão em etapas para transformar rotina, previsão e qualidade de decisão.
          </p>
        </div>
        <div className="setup-evolution-progress">
          <p className="section-label">Etapa ativa</p>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <strong>
            {safeActiveIndex + 1} de {chapters.length}
          </strong>
        </div>
      </div>

      <div className="setup-evolution-grid">
        <div className="setup-evolution-cards">
          {chapters.map((chapter, index) => (
            <button
              className={`setup-evolution-card${index === safeActiveIndex ? " active" : ""}`}
              key={chapter.id}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <div className="setup-evolution-card-head">
                <span className="setup-evolution-order">{index + 1}</span>
                <span className={`setup-evolution-state${chapter.done ? " done" : ""}`}>
                  {chapter.done ? "Concluída" : "Em evolucao"}
                </span>
              </div>
              <strong>{chapter.title}</strong>
              <p>{chapter.description}</p>
            </button>
          ))}
        </div>

        <article className="setup-evolution-spotlight">
          <p className="section-label">Momento atual</p>
          <h4>{activeChapter.title}</h4>
          <p>{activeChapter.description}</p>
          <div className="setup-evolution-impact">{activeChapter.impact}</div>
          <Link className="primary-button" href={activeChapter.actionHref}>
            {activeChapter.actionLabel}
          </Link>
        </article>
      </div>
    </section>
  );
}
