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
import { ImpactEvolution } from "@/components/impact-evolution";
import { QuickStartGuide } from "@/components/quick-start-guide";
import { RecentActivities } from "@/components/recent-activities";
import { RecentTransactions } from "@/components/recent-transactions";
import { getFinancialData } from "@/lib/financial-data";
import type { PersonalProfileRow } from "@/lib/money99-classic";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildForecastProjection,
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
  const importedCount = transactions.filter(
    (transaction) => transaction.source === "imported" || transaction.source === "openfinance"
  ).length;
  const hasPersonalProfile = Boolean(personalProfileRow);
  const hasAtLeastOneAccount = accounts.length > 0;
  const hasAtLeastOneTransaction = transactions.length > 0;
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
      title: "Criar primeira carteira",
      description: "Cadastre uma conta bancária ou carteira física para iniciar o controle.",
      href: "/accounts",
      actionLabel: "Abrir carteiras",
      done: hasAtLeastOneAccount
    },
    {
      id: "first-transaction",
      title: "Registrar primeiro movimento",
      description: "Comece com movimentos reais para ativar leitura de caixa e ritmo mensal.",
      href: "/transactions/new",
      actionLabel: "Novo movimento",
      done: hasAtLeastOneTransaction
    }
  ];

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

  return (
    <AppShell user={user} userEmail={user?.email} workspaceId={workspace.id}>
      <FirstAccessShowcase viewerKey={user?.id} />
      <div className="dashboard-grid">
        <DataSourceBanner fallbackReason={fallbackReason} source={source} />
        <HeroPanel dashboard={dashboard} projection={forecastProjection} />
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
        <FinancialTrajectoryPanel
          baseCurrency={workspace.baseCurrency}
          categories={categories}
          locale={workspace.locale}
          payees={payees}
          projection={forecastProjection}
          transactions={transactions}
        />
        <FinancialAgenda items={upcomingItems} locale={workspace.locale} payees={payees} />
        <ForecastCard
          baseCurrency={workspace.baseCurrency}
          locale={workspace.locale}
          projection={forecastProjection}
        />
        <FinancialHealthPanel
          baseCurrency={workspace.baseCurrency}
          locale={workspace.locale}
          postedExpenses={dashboard.postedExpenses}
          postedIncome={dashboard.postedIncome}
          scheduledExpenses={dashboard.scheduledExpenses}
          totalBalance={dashboard.totalBalance}
        />
        <DeepAiStrategyPanel
          baseCurrency={workspace.baseCurrency}
          hasGeminiKey={hasGeminiKey}
          locale={workspace.locale}
          projection={forecastProjection}
          scheduledExpenses={dashboard.scheduledExpenses}
        />
        <QuickStartGuide
          steps={quickStartSteps}
          subtitle="Conclua seu checklist inicial para o sistema ganhar contexto real de operação."
          title="Prepare seu arquivo em 3 passos"
        />
        <FinancialRoutinePanel
          accountCount={dashboard.accountCount}
          hasPersonalProfile={hasPersonalProfile}
          importedCount={importedCount}
          openScheduledCount={dashboard.scheduledCount}
          transactionCount={dashboard.transactionCount}
          workspaceName={workspace.name}
        />
        <CashflowTrend
          baseCurrency={workspace.baseCurrency}
          locale={workspace.locale}
          transactions={transactions}
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
