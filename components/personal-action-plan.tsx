import Link from "next/link";
import type { PersonalProfile } from "@/lib/money99-classic";

type ActionPriority = "Alta" | "Media" | "Baixa";

type ProfileAction = {
  id: string;
  title: string;
  description: string;
  reason: string;
  href: string;
  label: string;
  priority: ActionPriority;
};

const priorityRank: Record<ActionPriority, number> = {
  Alta: 0,
  Media: 1,
  Baixa: 2
};

export function PersonalActionPlan({
  answeredCount,
  profile,
  totalQuestions
}: {
  answeredCount: number;
  profile: PersonalProfile;
  totalQuestions: number;
}) {
  const actions = buildPersonalActionPlan(profile, answeredCount, totalQuestions);
  const completion = Math.round((answeredCount / Math.max(totalQuestions, 1)) * 100);
  const primaryAction = actions[0];

  return (
    <section className="personal-action-plan panel" aria-labelledby="personal-action-plan-title">
      <header className="personal-action-plan-header">
        <div>
          <p className="section-label">Plano de ação pessoal</p>
          <h3 id="personal-action-plan-title">Seu próximo movimento financeiro</h3>
          <p className="supporting-copy">
            O Deniaros cruza suas respostas com os módulos do sistema e transforma o
            perfil em prioridades práticas.
          </p>
        </div>
        <div className="personal-action-score" aria-label={`Perfil ${completion}% completo`}>
          <strong>{completion}%</strong>
          <span>perfil completo</span>
          <div className="personal-action-meter" aria-hidden="true">
            <span style={{ width: `${completion}%` }} />
          </div>
        </div>
      </header>

      {primaryAction ? (
        <article className="personal-action-highlight">
          <div>
            <span className={`action-priority priority-${primaryAction.priority.toLowerCase()}`}>
              {getPriorityLabel(primaryAction.priority)}
            </span>
            <h4>{primaryAction.title}</h4>
            <p>{primaryAction.description}</p>
          </div>
          <Link className="primary-button" href={primaryAction.href}>
            {primaryAction.label}
          </Link>
        </article>
      ) : null}

      <div className="personal-action-grid">
        {actions.slice(primaryAction ? 1 : 0).map((action, index) => (
          <article className="personal-action-card" key={action.id}>
            <div className="personal-action-card-top">
              <span className="action-index">{String(index + 2).padStart(2, "0")}</span>
              <span className={`action-priority priority-${action.priority.toLowerCase()}`}>
                {getPriorityLabel(action.priority)}
              </span>
            </div>
            <h4>{action.title}</h4>
            <p>{action.description}</p>
            <small>{action.reason}</small>
            <Link className="ghost-button" href={action.href}>
              {action.label}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildPersonalActionPlan(
  profile: PersonalProfile,
  answeredCount: number,
  totalQuestions: number
) {
  const answers = profile.classicAnswers;
  const actions: ProfileAction[] = [];
  const hasChildren =
    answers.childrenAgeGroups.under10 ||
    answers.childrenAgeGroups.between11And17 ||
    answers.childrenAgeGroups.over18;
  const hasFamilyScope =
    answers.financesScope === "self_and_spouse" ||
    answers.maritalStatus === "married" ||
    hasChildren ||
    answers.supportsAdult;

  if (answeredCount < totalQuestions) {
    actions.push({
      id: "complete-profile",
      title: "Concluir a entrevista financeira",
      description:
        "Finalize as perguntas que faltam para o sistema calibrar alertas, recomendações e prioridades.",
      reason: `${totalQuestions - answeredCount} resposta(s) ainda podem melhorar a precisão.`,
      href: `/personal-profile#q-${Math.max(answeredCount + 1, 1)}`,
      label: "Continuar perfil",
      priority: "Alta"
    });
  }

  if (answers.wantsExpenseMonitoring) {
    actions.push({
      id: "where-money-goes",
      title: "Entender para onde o dinheiro está indo",
      description:
        "Abra um retrato de hábitos de consumo para transformar histórico em decisão do mês.",
      reason: "Você indicou interesse em acompanhar despesas de perto.",
      href: "/reports?section=habits&report=where-money-goes",
      label: "Ver relatório",
      priority: "Alta"
    });
  }

  if (answers.usesCreditCard) {
    actions.push({
      id: "debt-plan",
      title: "Organizar cartão e dívidas antes que virem ruído",
      description:
        "Use o planejador para simular redução de débitos e manter juros fora do caminho.",
      reason: "Cartão de crédito exige previsão, não só registro posterior.",
      href: "/planner?view=debts",
      label: "Abrir planejador",
      priority: "Alta"
    });
  }

  if (answers.featureInterests.payBills || hasFamilyScope) {
    actions.push({
      id: "cashflow-agenda",
      title: "Montar agenda de compromissos e caixa futuro",
      description:
        "Cadastre contas, depósitos e lembretes para enxergar vencimentos antes do aperto.",
      reason: hasFamilyScope
        ? "Seu perfil sugere decisões compartilhadas ou familiares."
        : "Você marcou interesse em pagar e acompanhar contas.",
      href: "/financial-agenda",
      label: "Abrir agenda",
      priority: "Alta"
    });
  }

  if (answers.housing.ownHome || answers.housing.planBuyHome || answers.housing.rent) {
    actions.push({
      id: "home-base",
      title: "Separar moradia, patrimônio e custos da casa",
      description:
        "Registre bens, compromissos e custos recorrentes para proteger o orçamento de base.",
      reason: "Moradia apareceu no seu perfil como fator financeiro relevante.",
      href: "/home-inventory",
      label: "Mapear casa",
      priority: "Media"
    });
  }

  if (answers.hasInvestments || answers.hasRetirementPlan || answers.wantsFinanceNews) {
    actions.push({
      id: "investment-radar",
      title: "Criar radar de investimentos e aposentadoria",
      description:
        "Acompanhe posições, decisões críticas e horizonte de longo prazo em um só lugar.",
      reason: "Seu perfil indica investimento, aposentadoria ou interesse em notícias financeiras.",
      href: "/investments",
      label: "Ver investimentos",
      priority: "Media"
    });
  }

  if (answers.isSelfEmployed || answers.featureInterests.taxInfo) {
    actions.push({
      id: "tax-routine",
      title: "Preparar rotina de impostos e renda variável",
      description:
        "Classifique categorias fiscais e acompanhe dados úteis antes do fechamento do período.",
      reason: answers.isSelfEmployed
        ? "Autônomos precisam separar renda, impostos e caixa pessoal."
        : "Você pediu informações de impostos no perfil.",
      href: "/tax-categories",
      label: "Organizar impostos",
      priority: "Media"
    });
  }

  if (answers.featureInterests.monitorBalances) {
    actions.push({
      id: "accounts-base",
      title: "Consolidar contas e carteiras",
      description:
        "Revise saldos, carteiras manuais e futuras conexões para criar uma base confiável.",
      reason: "Monitorar saldos foi marcado como recurso importante.",
      href: "/accounts",
      label: "Ver carteiras",
      priority: "Baixa"
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: "default-cashflow",
      title: "Começar pela previsão de caixa",
      description:
        "Use a agenda financeira para transformar compromissos próximos em visão de futuro.",
      reason: "Quando o perfil ainda está neutro, a previsão é o melhor ponto de partida.",
      href: "/financial-agenda",
      label: "Abrir agenda",
      priority: "Alta"
    });
  }

  return dedupeActions(actions)
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
    .slice(0, 6);
}

function dedupeActions(actions: ProfileAction[]) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    if (seen.has(action.id)) {
      return false;
    }

    seen.add(action.id);
    return true;
  });
}

function getPriorityLabel(priority: ActionPriority) {
  return priority === "Media" ? "Média" : priority;
}
