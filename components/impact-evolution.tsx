import type { CSSProperties } from "react";
import { formatCurrency } from "@/lib/finance";
import type { CurrencyCode, LocaleCode } from "@/lib/domain";

function clampScore(value: number) {
  return Math.max(8, Math.min(99, Math.round(value)));
}

export function ImpactEvolution({
  accountCount,
  baseCurrency,
  hasPersonalProfile,
  importedCount,
  locale,
  postedExpenses,
  postedIncome,
  transactionCount
}: {
  accountCount: number;
  transactionCount: number;
  importedCount: number;
  hasPersonalProfile: boolean;
  postedIncome: number;
  postedExpenses: number;
  baseCurrency: CurrencyCode;
  locale: LocaleCode;
}) {
  const clarityScore = clampScore(transactionCount * 10 + (hasPersonalProfile ? 24 : 8));
  const controlScore = clampScore(accountCount * 18 + importedCount * 14 + 10);
  const growthScore = clampScore(
    (clarityScore + controlScore) / 2 + (postedIncome >= postedExpenses ? 12 : 4)
  );
  const todayNet = postedIncome - postedExpenses;

  const pillars = [
    {
      id: "clareza",
      title: "Clareza diária",
      text: "Menos duvida no fim do dia, mais visibilidade real de entradas e saídas.",
      score: clarityScore
    },
    {
      id: "controle",
      title: "Controle com previsão",
      text: "A cada importação e revisão, o arquivo responde mais rápido as suas decisões.",
      score: controlScore
    },
    {
      id: "evolucao",
      title: "Evolucao de patrimônio",
      text: "Com rotina consistente, o sistema sai do operacional e vira conselheiro.",
      score: growthScore
    }
  ];

  return (
    <section className="impact-evolution panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Transformação em movimento</p>
          <h3>Evolucao do usuário com Deniaros</h3>
        </div>
      </div>

      <div className="impact-strip">
        <article className="impact-callout">
          <p className="section-label">Hoje no arquivo</p>
          <strong>{formatCurrency(todayNet, baseCurrency, locale)}</strong>
          <p className="micro-copy">
            Resultado atual do fluxo já registrado. O objetivo e transformar esse número em
            planejamento contínuo.
          </p>
        </article>
        <article className="impact-callout pulse">
          <p className="section-label">Próximo nível</p>
          <strong>Rotina guiada + previsão</strong>
          <p className="micro-copy">
            Quando perfil, importação e lançamentos andam juntos, o sistema comeca a antecipar
            riscos e oportunidades.
          </p>
        </article>
      </div>

      <div className="impact-grid">
        {pillars.map((pillar, index) => (
          <article
            className="impact-card"
            key={pillar.id}
            style={
              {
                "--impact-delay": `${index * 120}ms`,
                "--impact-width": `${pillar.score}%`
              } as CSSProperties
            }
          >
            <h4>{pillar.title}</h4>
            <p>{pillar.text}</p>
            <div className="impact-meter">
              <div className="impact-meter-fill" />
            </div>
            <strong>{pillar.score}%</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
