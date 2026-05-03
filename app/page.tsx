import { AppShell } from "@/components/app-shell";
import { AccountsOverview } from "@/components/accounts-overview";
import { CashflowTrend } from "@/components/cashflow-trend";
import { DataSourceBanner } from "@/components/data-source-banner";
import { DeepAiStrategyPanel } from "@/components/deep-ai-strategy-panel";
import { FinancialHealthPanel } from "@/components/financial-health-panel";
import { FirstAccessShowcase } from "@/components/first-access-showcase";
import { HeroPanel } from "@/components/hero-panel";
import { ForecastCard } from "@/components/forecast-card";
import { FinancialAgenda } from "@/components/financial-agenda";
import { FinancialHomePersonalizer } from "@/components/financial-home-personalizer";
import { FinancialRoutinePanel } from "@/components/financial-routine-panel";
import { FinancialTrajectoryPanel } from "@/components/financial-trajectory-panel";
import { HighlightsGrid } from "@/components/highlights-grid";
import { HomeSecondaryTabs } from "@/components/home-secondary-tabs";
import { ImpactEvolution } from "@/components/impact-evolution";
import { QuickStartGuide } from "@/components/quick-start-guide";
import { RecentActivities } from "@/components/recent-activities";
import { RecentTransactions } from "@/components/recent-transactions";
import { MetricValue, WidgetWrapper } from "@/components/widget-wrapper";
import { getFinancialData } from "@/lib/financial-data";
import type { PersonalProfileRow } from "@/lib/money99-classic";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  buildForecastProjection,
  formatCurrency,
  formatShortDate,
  getAccountBalances,
  getOpenScheduledItems,
  getPostedExpenses,
  getPostedIncome,
  getScheduledExpenses,
  getScheduledIncome,
  getTotalBalance,
  getUpcomingItems
} from "@/lib/finance";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { accounts, categories, fallbackReason, payees, scheduledItems, source, transactions, workspace } =
    await getFinancialData({ supabase, user });
  const { data: personalProfileRow } = user
    ? await supabase
        .from("personal_profiles")
        .select("workspace_id")
        .eq("workspace_id", workspace.id)
        .maybeSingle<Pick<PersonalProfileRow, "workspace_id">>()
    : { data: null };
  const accountBalances = getAccountBalances(accounts, transactions);
  const totalBalance = getTotalBalance(accountBalances);
  const forecastProjection = buildForecastProjection({
    currentBalance: totalBalance,
    scheduledItems,
    horizonDays: 90
  });
  const upcomingItems = getUpcomingItems(scheduledItems);
  const openScheduledItems = getOpenScheduledItems(scheduledItems);
  const overdueScheduleCount = openScheduledItems.filter((item) => item.status === "overdue").length;
  const dueSoonScheduleCount = openScheduledItems.filter((item) => item.status === "due-soon").length;
  const pendingTransactionCount = transactions.filter((transaction) => transaction.status === "pending").length;
  const unclassifiedTransactionCount = transactions.filter(
    (transaction) => !transaction.transferAccountId && !transaction.categoryId
  ).length;
  const importedCount = transactions.filter(
    (transaction) => transaction.source === "imported" || transaction.source === "openfinance"
  ).length;
  const hasPersonalProfile = Boolean(personalProfileRow);
  const hasAtLeastOneAccount = accounts.length > 0;
  const hasAtLeastOneTransaction = transactions.length > 0;
  const hasOpenSchedule = openScheduledItems.length > 0;
  const hasOperationalBase =
    hasPersonalProfile && hasAtLeastOneAccount && hasAtLeastOneTransaction && hasOpenSchedule;
  const quickStartSteps = [
    {
      id: "profile",
      title: "Completar Perfil Pessoal",
      description: "Defina seu contexto para o sistema adaptar metas, linguagem e prioridades.",
      href: "/personal-profile",
      actionLabel: "Abrir perfil",
      done: hasPersonalProfile
    },
    {
      id: "first-account",
      title: "Conectar sua base de dinheiro",
      description: "Cadastre carteira fisica, conta manual ou prepare Open Finance para saldo confiavel.",
      href: "/accounts",
      actionLabel: "Abrir carteiras",
      done: hasAtLeastOneAccount
    },
    {
      id: "first-transaction",
      title: "Trazer movimentos reais",
      description: "Registre ou importe entradas e saidas para o sistema entender seu passado recente.",
      href: "/transactions/new",
      actionLabel: "Novo movimento",
      done: hasAtLeastOneTransaction
    },
    {
      id: "first-schedule",
      title: "Montar agenda de previsao",
      description: "Cadastre contas, depositos ou lembretes para projetar o caixa antes do aperto.",
      href: "/financial-agenda",
      actionLabel: "Abrir agenda",
      done: hasOpenSchedule
    },
    {
      id: "first-diagnosis",
      title: "Pedir um diagnostico ao Consultor IA",
      description: "Depois da base minima, use a IA para priorizar decisoes e proximos passos.",
      href: "/assistant?question=Me%20de%20um%20diagnostico%20acionavel%20de%20hoje",
      actionLabel: "Abrir Consultor IA",
      done: hasOperationalBase
    }
  ];
  const nextQuickStartStep = quickStartSteps.find((step) => !step.done);

  const dashboard = {
    totalBalance,
    baseCurrency: workspace.baseCurrency,
    locale: workspace.locale,
    postedIncome: getPostedIncome(transactions),
    postedExpenses: getPostedExpenses(transactions),
    scheduledIncome: getScheduledIncome(scheduledItems),
    scheduledExpenses: getScheduledExpenses(scheduledItems),
    accountCount: accountBalances.length,
    transactionCount: transactions.length,
    scheduledCount: openScheduledItems.length
  };
  const homeCommandActions = buildHomeCommandActions({
    baseCurrency: workspace.baseCurrency,
    dueSoonScheduleCount,
    importedCount,
    locale: workspace.locale,
    overdueScheduleCount,
    pendingTransactionCount,
    projection: forecastProjection,
    scheduledCount: dashboard.scheduledCount,
    unclassifiedTransactionCount
  });
  const nextBestAction = buildHomeNextBestAction({
    baseCurrency: workspace.baseCurrency,
    dueSoonScheduleCount,
    hasAtLeastOneAccount,
    hasAtLeastOneTransaction,
    hasOpenSchedule,
    hasPersonalProfile,
    locale: workspace.locale,
    overdueScheduleCount,
    pendingTransactionCount,
    projection: forecastProjection,
    unclassifiedTransactionCount
  });

  return (
    <AppShell user={user} userEmail={user?.email} workspaceId={workspace.id}>
      <FirstAccessShowcase
        primaryHref={nextQuickStartStep?.href}
        primaryLabel={nextQuickStartStep?.actionLabel}
        viewerKey={user?.id}
      />
      <div className="dashboard-grid gap-6 md:gap-8">
        <DataSourceBanner fallbackReason={fallbackReason} source={source} />
        <HeroPanel dashboard={dashboard} projection={forecastProjection} />
        <HomeNextBestAction action={nextBestAction} />
        <HomeCommandActions actions={homeCommandActions} />
        <HomeSecondaryTabs
          tabs={[
            {
              id: "forecast",
              label: "Previsão",
              title: "Previsão de saldo",
              children: (
                <ForecastCard
                  baseCurrency={workspace.baseCurrency}
                  locale={workspace.locale}
                  projection={forecastProjection}
                />
              )
            },
            {
              id: "cashflow",
              label: "Fluxo",
              title: "Fluxo de caixa",
              children: (
                <CashflowTrend
                  baseCurrency={workspace.baseCurrency}
                  locale={workspace.locale}
                  transactions={transactions}
                />
              )
            },
            {
              id: "health",
              label: "Saúde",
              title: "Saúde financeira",
              children: (
                <FinancialHealthPanel
                  baseCurrency={workspace.baseCurrency}
                  locale={workspace.locale}
                  postedExpenses={dashboard.postedExpenses}
                  postedIncome={dashboard.postedIncome}
                  scheduledExpenses={dashboard.scheduledExpenses}
                  totalBalance={dashboard.totalBalance}
                />
              )
            },
            {
              id: "ai",
              label: "IA",
              title: "Dicas e estratégia da IA",
              children: (
                <DeepAiStrategyPanel
                  baseCurrency={workspace.baseCurrency}
                  hasGeminiKey={hasGeminiKey}
                  locale={workspace.locale}
                  projection={forecastProjection}
                  scheduledExpenses={dashboard.scheduledExpenses}
                />
              )
            }
          ]}
        />
        <FinancialTrajectoryPanel
          baseCurrency={workspace.baseCurrency}
          categories={categories}
          locale={workspace.locale}
          payees={payees}
          projection={forecastProjection}
          transactions={transactions}
        />
        <FinancialAgenda items={upcomingItems} locale={workspace.locale} payees={payees} />
        <QuickStartGuide
          steps={quickStartSteps}
          subtitle="A ordem importa: perfil, base real, movimentos, agenda e diagnostico. Assim o Deniaros deixa de registrar o passado e comeca a projetar o futuro."
          title="Prepare seu Deniaros para decidir com voce"
        />
        <FinancialRoutinePanel
          accountCount={dashboard.accountCount}
          hasPersonalProfile={hasPersonalProfile}
          importedCount={importedCount}
          openScheduledCount={dashboard.scheduledCount}
          transactionCount={dashboard.transactionCount}
          workspaceName={workspace.name}
        />
        <FinancialHomePersonalizer
          accountBalances={accountBalances}
          baseCurrency={workspace.baseCurrency}
          hasPersonalProfile={hasPersonalProfile}
          importedCount={importedCount}
          locale={workspace.locale}
          openScheduledCount={dashboard.scheduledCount}
          projection={forecastProjection}
          transactionCount={dashboard.transactionCount}
        />
        <AccountsOverview accounts={accountBalances} locale={workspace.locale} />
        <HighlightsGrid dashboard={dashboard} />
        <RecentActivities accounts={accountBalances} locale={workspace.locale} transactions={transactions} />
        <ImpactEvolution
          accountCount={dashboard.accountCount}
          baseCurrency={dashboard.baseCurrency}
          hasPersonalProfile={hasPersonalProfile}
          importedCount={importedCount}
          locale={dashboard.locale}
          postedExpenses={dashboard.postedExpenses}
          postedIncome={dashboard.postedIncome}
          transactionCount={dashboard.transactionCount}
        />
        <RecentTransactions
          accounts={accountBalances}
          categories={categories}
          locale={workspace.locale}
          payees={payees}
          transactions={transactions}
        />
      </div>
    </AppShell>
  );
}

type HomeCommandAction = {
  actionLabel: string;
  description: string;
  href: string;
  label: string;
  title: string;
  tone: "stable" | "attention" | "danger";
  value: string;
};

type HomeNextBestAction = {
  actionLabel: string;
  description: string;
  href: string;
  metric: string;
  reason: string;
  title: string;
  tone: "stable" | "attention" | "danger";
};

function HomeNextBestAction({ action }: { action: HomeNextBestAction }) {
  return (
    <section className={`home-next-action home-next-action-${action.tone}`}>
      <div className="home-next-action-copy">
        <p className="section-label">Próxima melhor ação</p>
        <h3>{action.title}</h3>
        <p>{action.description}</p>
      </div>
      <div className="home-next-action-result">
        <span>{action.reason}</span>
        <strong>{action.metric}</strong>
      </div>
      <Link className={action.tone === "danger" ? "primary-button" : "ghost-button"} href={action.href}>
        {action.actionLabel}
      </Link>
    </section>
  );
}

function HomeCommandActions({ actions }: { actions: HomeCommandAction[] }) {
  return (
    <section className="home-command-actions" aria-label="Acoes recomendadas de hoje">
      {actions.map((action) => (
        <WidgetWrapper
          className="home-command-card"
          key={action.label}
          label={action.label}
          title={action.title}
          tone={action.tone}
          tooltip={action.description}
        >
          <MetricValue tone={action.tone}>{action.value}</MetricValue>
          <Link className={action.tone === "danger" ? "primary-button" : "ghost-button"} href={action.href}>
            {action.actionLabel}
          </Link>
        </WidgetWrapper>
      ))}
    </section>
  );
}

function buildHomeNextBestAction({
  baseCurrency,
  dueSoonScheduleCount,
  hasAtLeastOneAccount,
  hasAtLeastOneTransaction,
  hasOpenSchedule,
  hasPersonalProfile,
  locale,
  overdueScheduleCount,
  pendingTransactionCount,
  projection,
  unclassifiedTransactionCount
}: {
  baseCurrency: string;
  dueSoonScheduleCount: number;
  hasAtLeastOneAccount: boolean;
  hasAtLeastOneTransaction: boolean;
  hasOpenSchedule: boolean;
  hasPersonalProfile: boolean;
  locale: string;
  overdueScheduleCount: number;
  pendingTransactionCount: number;
  projection: ReturnType<typeof buildForecastProjection>;
  unclassifiedTransactionCount: number;
}): HomeNextBestAction {
  if (!hasPersonalProfile) {
    return {
      actionLabel: "Completar perfil",
      description: "Defina seu momento financeiro para o Deniaros priorizar metas, alertas e linguagem com mais precisão.",
      href: "/personal-profile",
      metric: "1 passo",
      reason: "Personalização pendente",
      title: "Comece pelo seu contexto.",
      tone: "attention"
    };
  }

  if (!hasAtLeastOneAccount) {
    return {
      actionLabel: "Criar carteira",
      description: "Sem uma carteira ou conta, o saldo não tem origem confiável e a previsão perde força.",
      href: "/accounts",
      metric: "0 contas",
      reason: "Base financeira ausente",
      title: "Conecte a base do seu dinheiro.",
      tone: "attention"
    };
  }

  if (!hasAtLeastOneTransaction) {
    return {
      actionLabel: "Registrar movimento",
      description: "O primeiro lançamento dá histórico ao sistema para começar a enxergar padrões reais.",
      href: "/transactions/new",
      metric: "0 movimentos",
      reason: "Histórico vazio",
      title: "Alimente o passado para projetar o futuro.",
      tone: "attention"
    };
  }

  if (!hasOpenSchedule) {
    return {
      actionLabel: "Montar agenda",
      description: "Cadastre contas, depósitos e lembretes para o saldo deixar de ser fotografia e virar previsão.",
      href: "/financial-agenda",
      metric: "0 compromissos",
      reason: "Previsão incompleta",
      title: "Transforme saldo em agenda.",
      tone: "attention"
    };
  }

  if (overdueScheduleCount > 0) {
    return {
      actionLabel: "Resolver agora",
      description: "Compromissos vencidos contaminam saldo, relatórios e decisões. Baixe, reagende ou ajuste antes de qualquer análise.",
      href: "/financial-agenda",
      metric: String(overdueScheduleCount),
      reason: "Atraso aberto",
      title: "Corrija os vencidos primeiro.",
      tone: "danger"
    };
  }

  if (projection.summary.riskLevel === "danger") {
    return {
      actionLabel: "Simular decisão",
      description: "A projeção aponta risco de saldo negativo. Teste cortes, antecipações ou mudança de data antes do aperto.",
      href: "/decisions",
      metric: formatShortDate(
        projection.summary.firstNegativeDate ?? projection.summary.lowestDate,
        locale
      ),
      reason: "Primeiro ponto crítico",
      title: "O futuro acendeu alerta.",
      tone: "danger"
    };
  }

  if (pendingTransactionCount > 0) {
    return {
      actionLabel: "Conferir pendências",
      description: "Movimentos pendentes reduzem a confiança do saldo. Finalize a conferência para limpar a mesa de decisão.",
      href: "/transactions?status=pending",
      metric: String(pendingTransactionCount),
      reason: "Movimentos pendentes",
      title: "Deixe o saldo pronto para decisão.",
      tone: "attention"
    };
  }

  if (unclassifiedTransactionCount > 0) {
    return {
      actionLabel: "Classificar",
      description: "Categorias revelam onde o dinheiro escapa. Sem elas, relatórios e IA perdem contexto.",
      href: "/transactions",
      metric: String(unclassifiedTransactionCount),
      reason: "Sem categoria",
      title: "Dê contexto ao seu histórico.",
      tone: "attention"
    };
  }

  if (dueSoonScheduleCount > 0) {
    return {
      actionLabel: "Ver vencimentos",
      description: "Há compromissos próximos. Antecipe o impacto no caixa antes de assumir novos gastos.",
      href: "/financial-agenda",
      metric: String(dueSoonScheduleCount),
      reason: "Próximos dias",
      title: "Antecipe o que está chegando.",
      tone: "attention"
    };
  }

  if (projection.summary.riskLevel === "attention") {
    return {
      actionLabel: "Ajustar plano",
      description: "O menor saldo previsto pede cautela. Reorganize uma conta, meta ou despesa antes de perder margem.",
      href: "/decisions",
      metric: formatCurrency(projection.summary.lowestBalance, baseCurrency, locale),
      reason: "Menor saldo previsto",
      title: "Ainda dá para agir com calma.",
      tone: "attention"
    };
  }

  return {
    actionLabel: "Pedir diagnóstico",
    description: "Com a base saudável, use a IA para escolher a próxima melhoria: reserva, dívida, orçamento ou meta.",
    href: "/assistant?question=Me%20de%20a%20proxima%20melhor%20acao%20para%20evoluir%20minha%20vida%20financeira",
    metric: formatCurrency(projection.summary.lowestBalance, baseCurrency, locale),
    reason: "Margem prevista",
    title: "Aproveite a zona boa para evoluir.",
    tone: "stable"
  };
}

function buildHomeCommandActions({
  baseCurrency,
  dueSoonScheduleCount,
  importedCount,
  locale,
  overdueScheduleCount,
  pendingTransactionCount,
  projection,
  scheduledCount,
  unclassifiedTransactionCount
}: {
  baseCurrency: string;
  dueSoonScheduleCount: number;
  importedCount: number;
  locale: string;
  overdueScheduleCount: number;
  pendingTransactionCount: number;
  projection: ReturnType<typeof buildForecastProjection>;
  scheduledCount: number;
  unclassifiedTransactionCount: number;
}): HomeCommandAction[] {
  const nextEvent = projection.events[0];
  const agendaAction: HomeCommandAction =
    overdueScheduleCount > 0
      ? {
          actionLabel: "Resolver agenda",
          description: "Compromissos vencidos distorcem previsao, saldo e decisoes. Baixe ou reagende primeiro.",
          href: "/financial-agenda",
          label: "Agenda",
          title: "Existe atraso para corrigir.",
          tone: "danger",
          value: String(overdueScheduleCount)
        }
      : dueSoonScheduleCount > 0
        ? {
            actionLabel: "Ver vencimentos",
            description: "Ha compromissos proximos. Antecipe o efeito no caixa antes de gastar no automatico.",
            href: "/financial-agenda",
            label: "Agenda",
            title: "Proximos dias pedem atencao.",
            tone: "attention",
            value: String(dueSoonScheduleCount)
          }
        : {
            actionLabel: "Abrir agenda",
            description: nextEvent
              ? `Proximo evento: ${nextEvent.title} em ${formatShortDate(nextEvent.date, locale)}.`
              : "Cadastre contas, depositos e lembretes para transformar saldo em previsao.",
            href: "/financial-agenda",
            label: "Agenda",
            title: scheduledCount ? "Agenda sob controle." : "Sua previsao precisa de agenda.",
            tone: scheduledCount ? "stable" : "attention",
            value: String(scheduledCount)
          };

  const transactionAction: HomeCommandAction =
    pendingTransactionCount > 0
      ? {
          actionLabel: "Conferir",
          description: "Movimentos pendentes ainda nao contam como saldo real. Finalize a conferencia antes dos relatorios.",
          href: "/transactions?status=pending",
          label: "Movimentos",
          title: "Ha lancamentos pendentes.",
          tone: "attention",
          value: String(pendingTransactionCount)
        }
      : unclassifiedTransactionCount > 0
        ? {
            actionLabel: "Classificar",
            description: "Sem categoria, o historico perde forca. Classifique para revelar padroes e vazamentos.",
            href: "/transactions",
            label: "Movimentos",
            title: "Historico precisa de contexto.",
            tone: "attention",
            value: String(unclassifiedTransactionCount)
          }
        : {
            actionLabel: importedCount ? "Revisar origem" : "Novo movimento",
            description: importedCount
              ? "Importacoes e Open Finance aceleram a rotina. Revise o que entrou para manter confianca."
              : "Registre ou importe movimentos para o Deniaros aprender com o passado recente.",
            href: importedCount ? "/transactions?source=imported" : "/transactions/new",
            label: "Movimentos",
            title: importedCount ? "Base real em construcao." : "Alimente seu historico.",
            tone: importedCount ? "stable" : "attention",
            value: String(importedCount)
          };

  const forecastAction: HomeCommandAction = {
    actionLabel: projection.summary.riskLevel === "stable" ? "Pedir diagnostico" : "Simular decisao",
    description:
      projection.summary.riskLevel === "danger"
        ? `A previsao pode ficar negativa em ${formatShortDate(
            projection.summary.firstNegativeDate ?? projection.summary.lowestDate,
            locale
          )}.`
        : projection.summary.riskLevel === "attention"
          ? `O menor ponto previsto e ${formatCurrency(
              projection.summary.lowestBalance,
              baseCurrency,
              locale
            )}. Vale ajustar antes do aperto.`
          : "Use a margem para reserva, meta ou antecipacao de dividas com mais calma.",
    href:
      projection.summary.riskLevel === "stable"
        ? "/assistant?question=Me%20de%20um%20diagnostico%20acionavel%20de%20hoje"
        : "/decisions",
    label: "Previsao",
    title:
      projection.summary.riskLevel === "danger"
        ? "O futuro acendeu alerta."
        : projection.summary.riskLevel === "attention"
          ? "Ainda da para agir antes."
          : "Caixa previsto em boa zona.",
    tone: projection.summary.riskLevel,
    value: formatCurrency(projection.summary.lowestBalance, baseCurrency, locale)
  };

  return [agendaAction, transactionAction, forecastAction];
}
