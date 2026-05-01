import { ActionFeedbackToast } from "@/components/action-feedback-toast";
import { ConnectionLamp, type ConnectionStatus } from "@/components/connection-lamp";
import { FloatingQuickActions } from "@/components/floating-quick-actions";
import { PageTransition } from "@/components/page-transition";
import { Sidebar } from "@/components/sidebar";
import { Topbar, type TopbarNotice, type TopbarPlanTier } from "@/components/topbar";
import { getAdminAccess } from "@/lib/admin-auth";
import { getFallbackProfile, getUserProfile } from "@/lib/profile";
import { getPlanDisplayNameFromId, resolvePlanVisualTier } from "@/lib/saas-plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureDefaultWorkspace } from "@/lib/workspace-bootstrap";
import type { User } from "@supabase/supabase-js";

type WorkspaceSummaryRow = {
  id: string;
  name: string;
};

type PersonalProfileSummaryRow = {
  workspace_id: string;
};

type SubscriptionSummaryRow = {
  plan_id: string;
  saas_plans?: { name: string; tier: string } | { name: string; tier: string }[] | null;
  status: "trialing" | "active" | "past_due" | "canceled" | "suspended" | "manual";
};

type AdvisorTransactionRow = {
  amount: number | string;
  status: "posted" | "pending";
  transfer_account_id: string | null;
};

export async function AppShell({
  children,
  user: initialUser,
  workspaceId,
  userEmail
}: {
  children: React.ReactNode;
  user?: User | null;
  workspaceId?: string;
  userEmail?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const user =
    initialUser === undefined
      ? (await supabase.auth.getUser()).data.user
      : initialUser;
  const profileResult = user ? await getUserProfile(supabase, user) : undefined;
  const profile = user
    ? profileResult?.profile ?? getFallbackProfile(user)
    : undefined;
  const themeClass = profile
    ? `theme-${profile.themeId} font-${profile.fontId} density-${profile.density}`
    : "theme-classic font-classic density-comfortable";
  let planTier = resolveActivePlanTier(user);
  let planLabel: string | undefined;
  const showAdmin = user ? (await getAdminAccess(supabase, user)).allowed : false;

  const notices: TopbarNotice[] = [];
  let connectionStatus: ConnectionStatus = "disconnected";

  if (user) {
    try {
      const activeWorkspaceId = workspaceId ?? (await ensureDefaultWorkspace(supabase, user));
      const today = createLocalIsoDate();
      const nextWeek = createLocalIsoDate(7);
      const monthStart = createMonthStartIsoDate();

      const [
        workspaceResult,
        personalProfileResult,
        accountsCountResult,
        transactionsCountResult,
        subscriptionResult,
        overdueScheduleResult,
        dueSoonScheduleResult,
        advisorTransactionsResult
      ] =
        await Promise.all([
          supabase
            .from("workspaces")
            .select("id,name")
            .eq("id", activeWorkspaceId)
            .maybeSingle<WorkspaceSummaryRow>(),
          supabase
            .from("personal_profiles")
            .select("workspace_id")
            .eq("workspace_id", activeWorkspaceId)
            .maybeSingle<PersonalProfileSummaryRow>(),
          supabase
            .from("accounts")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", activeWorkspaceId)
            .eq("is_active", true),
          supabase
            .from("transactions")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", activeWorkspaceId),
          supabase
            .from("saas_subscriptions")
            .select("plan_id,status,saas_plans(name,tier)")
            .eq("workspace_id", activeWorkspaceId)
            .eq("user_id", user.id)
            .maybeSingle<SubscriptionSummaryRow>(),
          supabase
            .from("scheduled_items")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", activeWorkspaceId)
            .neq("status", "paid")
            .lt("due_on", today),
          supabase
            .from("scheduled_items")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", activeWorkspaceId)
            .neq("status", "paid")
            .gte("due_on", today)
            .lte("due_on", nextWeek),
          supabase
            .from("transactions")
            .select("amount,status,transfer_account_id")
            .eq("workspace_id", activeWorkspaceId)
            .gte("occurred_on", monthStart)
            .lte("occurred_on", today)
            .returns<AdvisorTransactionRow[]>()
        ]);

      if (subscriptionResult.data && subscriptionResult.data.status !== "canceled") {
        const linkedPlan = Array.isArray(subscriptionResult.data.saas_plans)
          ? subscriptionResult.data.saas_plans[0]
          : subscriptionResult.data.saas_plans;
        planTier = resolvePlanVisualTier(subscriptionResult.data.plan_id, linkedPlan?.tier);
        planLabel = linkedPlan?.name ?? getPlanDisplayNameFromId(subscriptionResult.data.plan_id, linkedPlan?.tier);
      }

      if (workspaceResult.error) {
        connectionStatus = "disconnected";
        notices.push({
          id: "workspace-load-error",
          tone: "danger",
          title: "Workspace indisponível no momento.",
          description: "Não conseguimos carregar o workspace autenticado.",
          href: "/settings"
        });
      } else {
        connectionStatus = "connected";
      }

      if (
        personalProfileResult.error ||
        accountsCountResult.error ||
        transactionsCountResult.error ||
        subscriptionResult.error ||
        overdueScheduleResult.error ||
        dueSoonScheduleResult.error ||
        advisorTransactionsResult.error
      ) {
        connectionStatus = connectionStatus === "disconnected" ? "disconnected" : "attention";
      }

      if (!personalProfileResult.data) {
        notices.push({
          id: "profile-recommended",
          tone: "warning",
          title: "Perfil pessoal recomendado.",
          description:
            "Complete seu perfil para o sistema adaptar metas e recomendações.",
          href: "/personal-profile"
        });
      }

      if ((accountsCountResult.count ?? 0) === 0) {
        notices.push({
          id: "first-wallet",
          tone: "warning",
          title: "Crie sua primeira carteira.",
          description: "Cadastre sua conta bancária ou carteira física para iniciar seu controle.",
          href: "/accounts"
        });
      }

      if ((transactionsCountResult.count ?? 0) === 0) {
        notices.push({
          id: "first-transaction",
          tone: "info",
          title: "Registre seu primeiro movimento.",
          description: "Seu painel ganha previsão assim que os primeiros lançamentos entram.",
          href: "/transactions/new"
        });
      }

      const overdueScheduleCount = overdueScheduleResult.count ?? 0;
      const dueSoonScheduleCount = dueSoonScheduleResult.count ?? 0;

      if (overdueScheduleCount > 0) {
        notices.push({
          id: "advisor-overdue-schedule",
          tone: "danger",
          title: `${overdueScheduleCount} compromisso${overdueScheduleCount === 1 ? "" : "s"} em atraso.`,
          description: "Revise a agenda financeira antes que o atraso distorça sua previsão de caixa.",
          href: "/financial-agenda"
        });
      } else if (dueSoonScheduleCount > 0) {
        notices.push({
          id: "advisor-due-soon-schedule",
          tone: "warning",
          title: `${dueSoonScheduleCount} compromisso${dueSoonScheduleCount === 1 ? "" : "s"} nos próximos 7 dias.`,
          description: "Confira contas, depósitos e reservas antes do vencimento.",
          href: "/financial-agenda"
        });
      }

      const monthlyPosition = summarizeAdvisorTransactions(advisorTransactionsResult.data ?? []);

      if (monthlyPosition.expenses > monthlyPosition.income && monthlyPosition.expenses > 0) {
        notices.push({
          id: "advisor-monthly-negative",
          tone: "warning",
          title: "Despesas do mês acima das receitas.",
          description: "O Consultor financeiro recomenda revisar categorias e próximos vencimentos.",
          href: "/reports?section=habits&report=income-vs-expenses&period=year"
        });
      } else if (
        monthlyPosition.income > 0 &&
        monthlyPosition.expenses / monthlyPosition.income >= 0.85
      ) {
        notices.push({
          id: "advisor-monthly-tight",
          tone: "info",
          title: "Margem mensal ficando curta.",
          description: "Suas despesas já passaram de 85% das receitas lançadas neste mês.",
          href: "/reports?section=habits&report=income-vs-expenses&period=year"
        });
      }
    } catch {
      connectionStatus = "disconnected";
      notices.push({
        id: "connection-failure",
        tone: "danger",
        title: "Conexão interrompida.",
        description: "Verifique sua conexão ou tente novamente em alguns instantes."
      });
    }
  } else {
    notices.push({
      id: "session-required",
      tone: "danger",
      title: "Sessão não encontrada.",
      description: "Entre na sua conta para carregar o workspace."
    });
  }

  if (!notices.length) {
    notices.push({
      id: "all-good",
      tone: "success",
      title: "Tudo em ordem.",
      description: "Sem alertas no momento. Seu arquivo está saudável."
    });
  }

  return (
    <div className={`theme-frame ${themeClass}`}>
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteúdo
      </a>
      <div className="app-shell">
        <Sidebar profile={profile} showAdmin={showAdmin} userEmail={userEmail ?? user?.email} />
        <main className="content-area" id="conteudo-principal" tabIndex={-1}>
          <Topbar notices={notices} planLabel={planLabel} planTier={planTier} />
          <ActionFeedbackToast />
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <FloatingQuickActions />
      <ConnectionLamp status={connectionStatus} />
    </div>
  );
}

function summarizeAdvisorTransactions(transactions: AdvisorTransactionRow[]) {
  return transactions.reduce(
    (summary, transaction) => {
      if (transaction.status !== "posted" || transaction.transfer_account_id) {
        return summary;
      }

      const amount = Number(transaction.amount);

      if (!Number.isFinite(amount)) {
        return summary;
      }

      if (amount >= 0) {
        summary.income += amount;
      } else {
        summary.expenses += Math.abs(amount);
      }

      return summary;
    },
    {
      expenses: 0,
      income: 0
    }
  );
}

function createLocalIsoDate(daysToAdd = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return toIsoDate(date);
}

function createMonthStartIsoDate() {
  const date = new Date();
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0));
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveActivePlanTier(user: User | null | undefined): TopbarPlanTier {
  const rawPlan = [
    user?.app_metadata?.plan_tier,
    user?.app_metadata?.plan,
    user?.user_metadata?.plan_tier,
    user?.user_metadata?.plan
  ]
    .find((value) => typeof value === "string")
    ?.toLowerCase();

  if (rawPlan === "bronze") {
    return "bronze";
  }

  if (rawPlan === "gold" || rawPlan === "ouro" || rawPlan === "family" || rawPlan === "business") {
    return "gold";
  }

  if (
    rawPlan === "platinum" ||
    rawPlan === "platina" ||
    rawPlan === "private" ||
    rawPlan === "platinum_private"
  ) {
    return "platinum";
  }

  if (rawPlan === "free") {
    return "bronze";
  }

  return "silver";
}
