import Link from "next/link";

type RoutineStep = {
  cadence: string;
  title: string;
  description: string;
  href: string;
  action: string;
  readiness: "ready" | "attention" | "quiet";
};

export function FinancialRoutinePanel({
  accountCount,
  hasPersonalProfile,
  importedCount,
  openScheduledCount,
  transactionCount,
  workspaceName
}: {
  accountCount: number;
  hasPersonalProfile: boolean;
  importedCount: number;
  openScheduledCount: number;
  transactionCount: number;
  workspaceName: string;
}) {
  const routines: RoutineStep[] = [
    {
      cadence: "Diário",
      title: "Registrar sem deixar acumular",
      description:
        "Use movimentos rápidos para entradas, saídas e transferências enquanto a memória ainda está fresca.",
      href: "/transactions/new",
      action: "Novo movimento",
      readiness: transactionCount > 0 ? "ready" : "attention"
    },
    {
      cadence: "Semanal",
      title: "Conferir agenda, extratos e pendências",
      description:
        "Importe extratos, revise duplicados e cadastre contas recebidas antes que virem urgência.",
      href: openScheduledCount > 0 ? "/financial-agenda" : "/imports",
      action: openScheduledCount > 0 ? "Ver agenda" : "Importar extrato",
      readiness: openScheduledCount > 0 || importedCount > 0 ? "ready" : "quiet"
    },
    {
      cadence: "Mensal",
      title: "Olhar hábitos, orçamento e saldo final",
      description:
        "Compare receitas, despesas e categorias para entender o mês e ajustar o próximo.",
      href: "/reports?section=habits&report=income-vs-expenses",
      action: "Ver relatórios",
      readiness: transactionCount >= 5 ? "ready" : "quiet"
    },
    {
      cadence: "Anual",
      title: "Organizar categorias, contas inativas e impostos",
      description:
        "Revise favorecidos, categorias fiscais, patrimônio e dados que precisam fechar o ano limpos.",
      href: "/settings?area=finance",
      action: "Revisar base",
      readiness: accountCount > 0 && hasPersonalProfile ? "ready" : "attention"
    }
  ];

  return (
    <section className="financial-routine-panel panel" aria-labelledby="financial-routine-title">
      <div className="routine-hero">
        <div>
          <p className="section-label">Primeiros passos contínuos</p>
          <h3 id="financial-routine-title">Seu ritmo financeiro no Deniaros</h3>
          <p className="supporting-copy">
            No Money 99 isso era uma lista de tarefas. Aqui vira um ciclo de uso:
            registrar o presente, revisar a semana, fechar o mês e preparar o ano.
          </p>
        </div>
        <article className="routine-file-card">
          <p className="section-label">Arquivo financeiro</p>
          <strong>{workspaceName}</strong>
          <p>
            Pense no workspace como o antigo arquivo do Money: ele guarda suas contas,
            categorias, movimentos, relatórios e previsões em um só contexto.
          </p>
          <Link className="ghost-button" href="/settings?area=system">
            Ajustar workspace
          </Link>
        </article>
      </div>

      <div className="routine-grid">
        {routines.map((routine) => (
          <article className={`routine-card ${routine.readiness}`} key={routine.cadence}>
            <span>{routine.cadence}</span>
            <h4>{routine.title}</h4>
            <p>{routine.description}</p>
            <Link className={routine.readiness === "attention" ? "primary-button" : "ghost-button"} href={routine.href}>
              {routine.action}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
