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
import { MarketingLanding } from "@/components/marketing-landing";
import { QuickStartGuide } from "@/components/quick-start-guide";
import { RecentActivities } from "@/components/recent-activities";
import { RecentTransactions } from "@/components/recent-transactions";
import { SpendingSimulatorCard } from "@/components/spending-simulator-card";
import { MetricValue, WidgetWrapper } from "@/components/widget-wrapper";
import {
  classifyFinancialWorkspaceState,
  getFinancialNextStep,
  type FinancialWorkspaceState,
  type FinancialNextStep
} from "@/lib/financial-state";
import { getFinancialData } from "@/lib/financial-data";
import { buildEmergencyModePlan, type EmergencyPlan } from "@/lib/emergency-mode";
import type { PersonalProfileRow } from "@/lib/money99-classic";
import {
  buildOnboardingGuidance,
  getQuickOnboardingAnswers,
  type OnboardingGuidance
} from "@/lib/onboarding-guidance";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canShowAdvancedInsights,
  getWorkspaceMaturity,
  type WorkspaceMaturity
} from "@/lib/workspace-maturity";
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
    return <MarketingLanding />;
  }

  const { accounts, categories, fallbackReason, payees, scheduledItems, source, transactions, workspace } =
    await getFinancialData({ supabase, user });
  const [personalProfileResult, budgetCountResult, debtCountResult] = user
    ? await Promise.all([
        supabase
          .from("personal_profiles")
          .select("workspace_id,classic_answers")
          .eq("workspace_id", workspace.id)
          .maybeSingle<Pick<PersonalProfileRow, "workspace_id" | "classic_answers">>(),
        supabase
          .from("category_budgets")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspace.id),
        supabase
          .from("debt_reduction_debts")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspace.id)
          .eq("included_in_plan", true)
      ])
    : [
        { data: null, error: null, count: 0 },
        { data: null, error: null, count: 0 },
        { data: null, error: null, count: 0 }
      ];
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
  const hasPersonalProfile = Boolean(personalProfileResult.data);
  if (!hasPersonalProfile && source !== "sample") {
    redirect("/personal-profile?onboarding=1&next=/");
  }
  const onboardingGuidance = buildOnboardingGuidance(
    getQuickOnboardingAnswers(personalProfileResult.data?.classic_answers)
  );

  const budgetCount = budgetCountResult.error ? 0 : budgetCountResult.count ?? 0;
  const debtCount = debtCountResult.error ? 0 : debtCountResult.count ?? 0;
  const hasAtLeastOneAccount = accounts.length > 0;
  const hasAtLeastOneTransaction = transactions.length > 0;
  const hasOpenSchedule = openScheduledItems.length > 0;
  const workspaceMaturity = getWorkspaceMaturity({
    accountCount: accounts.length,
    scheduledCount: openScheduledItems.length,
    transactionCount: transactions.length
  });
  const financialState = classifyFinancialWorkspaceState({
    accountCount: accounts.length,
    currentBalance: totalBalance,
    dueSoonCommitmentCount: dueSoonScheduleCount,
    firstNegativeDate: forecastProjection.summary.firstNegativeDate,
    next7DaysNetCommitments: getNextDaysNetCommitments(forecastProjection.events, 7),
    overdueCommitmentCount: overdueScheduleCount,
    projectedLowestBalance: forecastProjection.summary.lowestBalance,
    transactionCount: transactions.length
  });
  const financialNextStep = getFinancialNextStep(financialState);
  const emergencyPlan = buildEmergencyModePlan({
    currentBalance: totalBalance,
    items: openScheduledItems
  });
  const showAdvancedInsights = canShowAdvancedInsights(workspaceMaturity);
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
      description: onboardingGuidance.accountDescription,
      href: onboardingGuidance.accountHref,
      actionLabel: onboardingGuidance.accountActionLabel,
      done: hasAtLeastOneAccount
    },
    {
      id: "first-transaction",
      title: "Trazer movimentos reais",
      description: onboardingGuidance.transactionDescription,
      href: onboardingGuidance.transactionHref,
      actionLabel: onboardingGuidance.transactionActionLabel,
      done: hasAtLeastOneTransaction
    },
    {
      id: "first-schedule",
      title: "Montar agenda de previsao",
      description: onboardingGuidance.scheduleDescription,
      href: "/financial-agenda",
      actionLabel: "Abrir agenda",
      done: hasOpenSchedule
    },
    {
      id: "first-diagnosis",
      title: "Pedir um diagnostico ao Consultor IA",
      description: onboardingGuidance.aiDescription,
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
  if (workspaceMaturity === "workspace_empty" || workspaceMaturity === "workspace_initialized") {
    return (
      <AppShell user={user} userEmail={user?.email} workspaceId={workspace.id}>
        <div className="dashboard-grid gap-6 md:gap-8">
          <DataSourceBanner fallbackReason={fallbackReason} source={source} />
          <HomeStarterExperience
            accounts={accountBalances}
            baseCurrency={workspace.baseCurrency}
            financialNextStep={financialNextStep}
            locale={workspace.locale}
            maturity={workspaceMaturity}
            onboardingGuidance={onboardingGuidance}
            totalBalance={totalBalance}
          />
          <QuickStartGuide
            steps={quickStartSteps}
            subtitle={onboardingGuidance.quickStartSubtitle}
            title="Comece sem ruído"
          />
          {accountBalances.length ? (
            <AccountsOverview accounts={accountBalances} locale={workspace.locale} />
          ) : null}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user} userEmail={user?.email} workspaceId={workspace.id}>
      <FirstAccessShowcase
        primaryHref={nextQuickStartStep?.href}
        primaryLabel={nextQuickStartStep?.actionLabel}
        viewerKey={user?.id}
      />
      <div className="dashboard-grid gap-6 md:gap-8">
        <DataSourceBanner fallbackReason={fallbackReason} source={source} />
        <HomeFinancialGuide action={financialNextStep} />
        <SpendingSimulatorCard
          accounts={accountBalances}
          baseCurrency={workspace.baseCurrency}
          locale={workspace.locale}
          scheduledItems={openScheduledItems}
        />
        {financialState === "emergency" ? (
          <HomeEmergencyMode
            baseCurrency={workspace.baseCurrency}
            locale={workspace.locale}
            plan={emergencyPlan}
            state={financialState}
            totalBalance={totalBalance}
          />
        ) : null}
        <HeroPanel dashboard={dashboard} projection={forecastProjection} />
        <HomeCommandActions actions={homeCommandActions} />
        {showAdvancedInsights ? (
          <>
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
          </>
        ) : null}
        <FinancialAgenda items={upcomingItems} locale={workspace.locale} payees={payees} />
        <QuickStartGuide
          steps={quickStartSteps}
          subtitle={onboardingGuidance.quickStartSubtitle}
          title="Prepare seu Deniaros para decidir com voce"
        />
        {showAdvancedInsights ? (
          <>
            <FinancialRoutinePanel
              accountCount={dashboard.accountCount}
              budgetCount={budgetCount}
              dueSoonScheduleCount={dueSoonScheduleCount}
              forecastRiskLevel={forecastProjection.summary.riskLevel}
              hasPersonalProfile={hasPersonalProfile}
              importedCount={importedCount}
              includedDebtCount={debtCount}
              openScheduledCount={dashboard.scheduledCount}
              overdueScheduleCount={overdueScheduleCount}
              pendingTransactionCount={pendingTransactionCount}
              transactionCount={dashboard.transactionCount}
              unclassifiedTransactionCount={unclassifiedTransactionCount}
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
          </>
        ) : null}
        <AccountsOverview accounts={accountBalances} locale={workspace.locale} />
        <HighlightsGrid dashboard={dashboard} />
        <RecentActivities accounts={accountBalances} locale={workspace.locale} transactions={transactions} />
        {showAdvancedInsights ? (
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
        ) : null}
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

function HomeStarterExperience({
  accounts,
  baseCurrency,
  financialNextStep,
  locale,
  maturity,
  onboardingGuidance,
  totalBalance
}: {
  accounts: ReturnType<typeof getAccountBalances>;
  baseCurrency: string;
  financialNextStep: FinancialNextStep;
  locale: string;
  maturity: WorkspaceMaturity;
  onboardingGuidance: OnboardingGuidance;
  totalBalance: number;
}) {
  const isEmpty = maturity === "workspace_empty";

  const checklist = [
    {
      done: true,
      label: "Contexto inicial definido"
    },
    {
      done: !isEmpty,
      label: "Primeira carteira criada"
    },
    {
      done: false,
      label: isEmpty ? "Primeiro movimento após a carteira" : onboardingGuidance.transactionActionLabel
    }
  ];

  return (
    <section className="panel home-starter-panel">
      <div className="home-starter-hero">
        <div>
          <p className="section-label">Consultor guiado</p>
          <h2>{financialNextStep.title}</h2>
          <p className="supporting-copy">{financialNextStep.description}</p>
          <p className="muted-copy">{onboardingGuidance.nextActionHint}</p>
          <div className="form-actions">
            <Link className="primary-button" href={financialNextStep.href}>
              {financialNextStep.actionLabel}
            </Link>
            <Link className="ghost-button" href={financialNextStep.secondaryHref}>
              {financialNextStep.secondaryLabel}
            </Link>
          </div>
        </div>
        <article className="home-starter-balance-card">
          <span>Saldo atual</span>
          <strong>{formatCurrency(totalBalance, baseCurrency, locale)}</strong>
          <p>{accounts.length} carteira(s) cadastrada(s)</p>
        </article>
      </div>

      <div className="home-starter-grid">
        <WidgetWrapper title="Próxima ação recomendada" tooltip="A Home inicial mostra apenas o próximo passo que libera valor real.">
          <p className="section-label">{onboardingGuidance.starterMetricLabel}</p>
          <MetricValue>{isEmpty ? onboardingGuidance.starterMetricValue : onboardingGuidance.transactionActionLabel}</MetricValue>
          <p className="muted-copy">
            {isEmpty
              ? onboardingGuidance.accountDescription
              : onboardingGuidance.transactionDescription}
          </p>
        </WidgetWrapper>

        <WidgetWrapper title="Checklist de início" tooltip="A sequência evita módulos avançados antes da base financeira existir.">
          <div className="home-starter-checklist">
            {checklist.map((item) => (
              <span className={item.done ? "done" : ""} key={item.label}>
                {item.done ? "✓" : "•"} {item.label}
              </span>
            ))}
          </div>
        </WidgetWrapper>

        <WidgetWrapper title="Carteiras" tooltip="As carteiras reais são criadas pelo usuário. Dados de exemplo não entram como base financeira real.">
          {accounts.length ? (
            <div className="home-starter-accounts">
              {accounts.slice(0, 3).map((account) => (
                <span key={account.id}>
                  <strong>{account.name}</strong>
                  {formatCurrency(account.currentBalance, account.currency, locale)}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted-copy">Nenhuma carteira real cadastrada ainda.</p>
          )}
        </WidgetWrapper>
      </div>
    </section>
  );
}

function HomeFinancialGuide({ action }: { action: FinancialNextStep }) {
  return (
    <section className={`home-financial-guide home-financial-guide-${action.tone}`}>
      <div className="home-financial-guide-copy">
        <p className="section-label">Seu próximo passo</p>
        <h3>{action.title}</h3>
        <p>{action.description}</p>
      </div>
      <div className="home-financial-guide-actions">
        <Link className="primary-button" href={action.href}>
          {action.actionLabel}
        </Link>
        <Link className="ghost-button" href={action.secondaryHref}>
          {action.secondaryLabel}
        </Link>
      </div>
    </section>
  );
}

function HomeEmergencyMode({
  baseCurrency,
  locale,
  plan,
  state,
  totalBalance
}: {
  baseCurrency: string;
  locale: string;
  plan: EmergencyPlan;
  state: FinancialWorkspaceState;
  totalBalance: number;
}) {
  const firstRecommended = plan.recommendedOrder[0];
  const next7Total = plan.dueNext7Days.reduce((total, item) => total + Math.abs(Math.min(item.amount, 0)), 0);

  return (
    <section className={`panel emergency-mode-panel emergency-mode-${state}`} id="modo-emergencia">
      <div className="emergency-mode-head">
        <div>
          <p className="section-label">Estou apertado</p>
          <h3>Vamos decidir por urgência.</h3>
          <p>{plan.survivalMessage}</p>
        </div>
        <article>
          <span>Saldo agora</span>
          <strong>{formatCurrency(totalBalance, baseCurrency, locale)}</strong>
        </article>
      </div>

      <div className="emergency-mode-grid">
        <WidgetWrapper
          label="Agora"
          title="Vencidas"
          tone={plan.overdue.length ? "danger" : "stable"}
          tooltip="Contas vencidas entram primeiro porque já afetam sua margem de decisão."
        >
          <MetricValue tone={plan.overdue.length ? "danger" : "stable"}>{plan.overdue.length}</MetricValue>
          <p className="muted-copy">Compromisso(s) para resolver ou renegociar.</p>
        </WidgetWrapper>

        <WidgetWrapper
          label="7 dias"
          title="Próximos compromissos"
          tone={next7Total > totalBalance ? "danger" : "attention"}
          tooltip="Soma das saídas em aberto nos próximos 7 dias."
        >
          <MetricValue tone={next7Total > totalBalance ? "danger" : "attention"}>
            {formatCurrency(next7Total, baseCurrency, locale)}
          </MetricValue>
          <p className="muted-copy">{plan.dueNext7Days.length} item(ns) chegando.</p>
        </WidgetWrapper>

        <WidgetWrapper
          label="Prioridade"
          title="Essenciais"
          tone="attention"
          tooltip="Classificação inicial por palavras como aluguel, energia, mercado, saúde e transporte."
        >
          <MetricValue tone="attention">{plan.essentials.length}</MetricValue>
          <p className="muted-copy">Itens que tendem a sustentar sua rotina.</p>
        </WidgetWrapper>
      </div>

      <div className="emergency-mode-order">
        <div>
          <p className="section-label">Ordem recomendada</p>
          <h4>{firstRecommended ? "Comece pelo que protege sua semana." : "Nenhuma urgência aberta agora."}</h4>
        </div>
        {plan.recommendedOrder.length ? (
          <ol>
            {plan.recommendedOrder.slice(0, 5).map((item) => (
              <li key={item.id}>
                <span>
                  <strong>{item.title}</strong>
                  {item.priority === "essential" ? "Essencial" : "Negociável"}
                </span>
                <em>{formatCurrency(Math.abs(item.amount), item.currency, locale)}</em>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted-copy">Use o simulador antes de assumir um novo gasto.</p>
        )}
      </div>
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

function getNextDaysNetCommitments(events: ReturnType<typeof buildForecastProjection>["events"], days: number) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
  const limit = new Date(start);
  limit.setDate(start.getDate() + days);
  const limitIso = limit.toISOString().slice(0, 10);

  return events
    .filter((event) => event.date <= limitIso)
    .reduce((total, event) => total + event.amount, 0);
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
