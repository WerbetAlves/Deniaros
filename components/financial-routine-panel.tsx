import { ContextualHelp } from "@/components/contextual-help";
import Link from "next/link";

type RoutineReadiness = "ready" | "attention" | "quiet";

type RoutineStep = {
  action: string;
  cadence: string;
  description: string;
  href: string;
  readiness: RoutineReadiness;
  title: string;
};

type WeeklyReviewStep = {
  action: string;
  detail: string;
  href: string;
  label: string;
  metric: string;
  state: "done" | "attention" | "quiet";
};

export function FinancialRoutinePanel({
  accountCount,
  budgetCount,
  dueSoonScheduleCount,
  forecastRiskLevel,
  hasPersonalProfile,
  importedCount,
  includedDebtCount,
  openScheduledCount,
  overdueScheduleCount,
  pendingTransactionCount,
  transactionCount,
  unclassifiedTransactionCount,
  workspaceName
}: {
  accountCount: number;
  budgetCount: number;
  dueSoonScheduleCount: number;
  forecastRiskLevel: "stable" | "attention" | "danger";
  hasPersonalProfile: boolean;
  importedCount: number;
  includedDebtCount: number;
  openScheduledCount: number;
  overdueScheduleCount: number;
  pendingTransactionCount: number;
  transactionCount: number;
  unclassifiedTransactionCount: number;
  workspaceName: string;
}) {
  const weeklySteps = buildWeeklyReviewSteps({
    accountCount,
    budgetCount,
    dueSoonScheduleCount,
    forecastRiskLevel,
    importedCount,
    includedDebtCount,
    openScheduledCount,
    overdueScheduleCount,
    pendingTransactionCount,
    transactionCount,
    unclassifiedTransactionCount
  });
  const weeklyAttentionCount = weeklySteps.filter((step) => step.state === "attention").length;
  const weeklyDoneCount = weeklySteps.filter((step) => step.state === "done").length;
  const routines: RoutineStep[] = [
    {
      action: "Novo movimento",
      cadence: "Diário",
      description:
        "Registre entradas, saídas e transferências enquanto a memória ainda está fresca.",
      href: "/transactions/new",
      readiness: transactionCount > 0 ? "ready" : "attention",
      title: "Registrar sem deixar acumular"
    },
    {
      action: "Revisar semana",
      cadence: "Semanal",
      description:
        "Passe por saldo, vencimentos, importados, orçamento e dívidas antes de começar outra semana.",
      href: "#rotina-semanal-guiada",
      readiness: weeklyAttentionCount > 0 ? "attention" : weeklyDoneCount >= 4 ? "ready" : "quiet",
      title: "Executar revisão guiada"
    },
    {
      action: "Ver relatórios",
      cadence: "Mensal",
      description:
        "Compare receitas, despesas e categorias para entender o mês e ajustar o próximo.",
      href: "/reports?section=habits&report=income-vs-expenses",
      readiness: transactionCount >= 5 ? "ready" : "quiet",
      title: "Olhar hábitos, orçamento e saldo final"
    },
    {
      action: "Revisar base",
      cadence: "Anual",
      description:
        "Revise favorecidos, categorias fiscais, patrimônio e dados que precisam fechar o ano limpos.",
      href: "/settings?area=finance",
      readiness: accountCount > 0 && hasPersonalProfile ? "ready" : "attention",
      title: "Organizar categorias, contas e impostos"
    }
  ];

  return (
    <section className="financial-routine-panel panel" aria-labelledby="financial-routine-title">
      <div className="routine-hero">
        <div>
          <p className="section-label">Primeiros passos contínuos</p>
          <div className="routine-title-row">
            <h3 id="financial-routine-title">Seu ritmo financeiro no Deniaros</h3>
            <ContextualHelp
              aiPrompt="Explique minha rotina financeira ideal no Deniaros com base nos meus dados."
              tooltip="Ciclo de uso recomendado: registrar o presente, revisar a semana, fechar o mês e preparar o ano sem transformar a gestão financeira em burocracia."
            />
          </div>
        </div>
        <article className="routine-file-card">
          <div className="routine-file-head">
            <p className="section-label">Arquivo financeiro</p>
            <ContextualHelp
              aiPrompt="O que devo revisar no meu workspace financeiro agora?"
              tooltip="Workspace é o arquivo financeiro do Deniaros: ele concentra contas, categorias, movimentos, relatórios e previsões no mesmo contexto."
            />
          </div>
          <strong>{workspaceName}</strong>
          <Link className="ghost-button" href="/settings/workspace">
            Ajustar workspace
          </Link>
        </article>
      </div>

      <div className="routine-grid">
        {routines.map((routine) => (
          <article className={`routine-card ${routine.readiness}`} key={routine.cadence}>
            <span>{routine.cadence}</span>
            <div className="routine-card-head">
              <h4>{routine.title}</h4>
              <ContextualHelp
                aiPrompt={`Me oriente sobre esta rotina no Deniaros: ${routine.title}.`}
                tooltip={routine.description}
              />
            </div>
            <Link className={routine.readiness === "attention" ? "primary-button" : "ghost-button"} href={routine.href}>
              {routine.action}
            </Link>
          </article>
        ))}
      </div>

      <section className="weekly-review-board" id="rotina-semanal-guiada" aria-labelledby="weekly-review-title">
        <div className="weekly-review-head">
          <div>
            <p className="section-label">Rotina semanal guiada</p>
            <div className="routine-title-row">
              <h4 id="weekly-review-title">Feche a semana antes que ela feche você.</h4>
              <ContextualHelp
                aiPrompt="Conduza minha revisão semanal do Deniaros em cinco passos."
                tooltip="Revisão semanal: saldo, vencimentos, movimentos importados, orçamento e dívidas. A ideia é decidir a semana antes que urgências decidam por você."
              />
            </div>
          </div>
          <div className="weekly-review-score">
            <span>{weeklyDoneCount}/5 prontos</span>
            <strong>{weeklyAttentionCount ? `${weeklyAttentionCount} alerta(s)` : "Semana limpa"}</strong>
          </div>
        </div>

        <div className="weekly-review-list">
          {weeklySteps.map((step, index) => (
            <Link className={`weekly-review-step ${step.state}`} href={step.href} key={step.label}>
              <span className="weekly-review-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{step.label}</strong>
                <p>{step.detail}</p>
              </div>
              <b>{step.metric}</b>
              <em>{step.action}</em>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}

function buildWeeklyReviewSteps({
  accountCount,
  budgetCount,
  dueSoonScheduleCount,
  forecastRiskLevel,
  importedCount,
  includedDebtCount,
  openScheduledCount,
  overdueScheduleCount,
  pendingTransactionCount,
  transactionCount,
  unclassifiedTransactionCount
}: {
  accountCount: number;
  budgetCount: number;
  dueSoonScheduleCount: number;
  forecastRiskLevel: "stable" | "attention" | "danger";
  importedCount: number;
  includedDebtCount: number;
  openScheduledCount: number;
  overdueScheduleCount: number;
  pendingTransactionCount: number;
  transactionCount: number;
  unclassifiedTransactionCount: number;
}): WeeklyReviewStep[] {
  const balanceAttention =
    accountCount === 0 ||
    transactionCount === 0 ||
    pendingTransactionCount > 0 ||
    forecastRiskLevel === "danger";

  return [
    {
      action: balanceAttention ? "Conferir saldo" : "Abrir carteiras",
      detail:
        accountCount === 0
          ? "Cadastre uma carteira para a revisão começar com saldo confiável."
          : pendingTransactionCount > 0
            ? "Movimentos pendentes ainda impedem uma leitura limpa do saldo."
            : forecastRiskLevel === "danger"
              ? "A previsão indica risco. Revise o saldo antes de decidir gastos."
              : "Saldos carregados e prontos para a leitura da semana.",
      href: accountCount === 0 ? "/accounts" : pendingTransactionCount > 0 ? "/transactions?status=pending" : "/accounts",
      label: "Saldo",
      metric: accountCount ? `${accountCount} conta(s)` : "0 contas",
      state: balanceAttention ? "attention" : "done"
    },
    {
      action: overdueScheduleCount > 0 ? "Resolver atrasos" : "Ver agenda",
      detail:
        overdueScheduleCount > 0
          ? "Baixe, reagende ou ajuste contas vencidas antes da próxima semana."
          : dueSoonScheduleCount > 0
            ? "Há vencimentos próximos. Antecipe o impacto no caixa."
            : openScheduledCount > 0
              ? "Agenda ativa, sem atrasos detectados agora."
              : "Cadastre contas e depósitos para a previsão ganhar calendário.",
      href: "/financial-agenda",
      label: "Vencimentos",
      metric:
        overdueScheduleCount > 0
          ? `${overdueScheduleCount} vencido(s)`
          : dueSoonScheduleCount > 0
            ? `${dueSoonScheduleCount} próximo(s)`
            : `${openScheduledCount} aberto(s)`,
      state: overdueScheduleCount > 0 ? "attention" : openScheduledCount > 0 ? "done" : "quiet"
    },
    {
      action: pendingTransactionCount || unclassifiedTransactionCount ? "Revisar movimentos" : "Importar extrato",
      detail:
        pendingTransactionCount > 0
          ? "Finalize pendências para evitar duplicidade e saldo incompleto."
          : unclassifiedTransactionCount > 0
            ? "Classifique o que entrou sem categoria para fortalecer relatórios."
            : importedCount > 0
              ? "Importações existem. Use a revisão para manter a base limpa."
              : "Traga extratos CSV/QIF ou Open Finance quando estiver disponível.",
      href: pendingTransactionCount || unclassifiedTransactionCount ? "/transactions" : "/imports",
      label: "Importados",
      metric:
        pendingTransactionCount > 0
          ? `${pendingTransactionCount} pendente(s)`
          : unclassifiedTransactionCount > 0
            ? `${unclassifiedTransactionCount} sem categoria`
            : `${importedCount} importado(s)`,
      state: pendingTransactionCount || unclassifiedTransactionCount ? "attention" : importedCount > 0 ? "done" : "quiet"
    },
    {
      action: budgetCount > 0 ? "Revisar orçamento" : "Criar orçamento",
      detail:
        budgetCount > 0
          ? "Compare limites e gastos reais antes de iniciar a próxima semana."
          : "Crie ao menos um orçamento mensal para saber quanto pode gastar.",
      href: "/planner?view=budget",
      label: "Orçamento",
      metric: budgetCount ? `${budgetCount} ativo(s)` : "sem plano",
      state: budgetCount > 0 ? "done" : "quiet"
    },
    {
      action: includedDebtCount > 0 ? "Acompanhar plano" : "Mapear dívidas",
      detail:
        includedDebtCount > 0
          ? "Revise se o pagamento planejado ainda cabe no orçamento da semana."
          : "Inclua cartões, empréstimos ou saldos negativos para medir juros e ordem de ataque.",
      href: "/planner?view=debts",
      label: "Dívidas",
      metric: includedDebtCount ? `${includedDebtCount} no plano` : "não mapeadas",
      state: includedDebtCount > 0 ? "done" : "quiet"
    }
  ];
}
