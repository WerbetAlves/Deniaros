import { ActionFeedbackToast } from "@/components/action-feedback-toast";
import { ConnectionLamp, type ConnectionStatus } from "@/components/connection-lamp";
import { FloatingQuickActions } from "@/components/floating-quick-actions";
import { ObservabilityTracker } from "@/components/observability-tracker";
import { PageTransition } from "@/components/page-transition";
import { Sidebar } from "@/components/sidebar";
import { Topbar, type TopbarNotice, type TopbarPlanTier } from "@/components/topbar";
import { syncActiveFinancialAlerts } from "@/lib/active-financial-alerts";
import { getAdminAccess } from "@/lib/admin-auth";
import { getFallbackProfile, getUserProfile } from "@/lib/profile";
import { getPlanDisplayNameFromId, resolvePlanVisualTier } from "@/lib/saas-plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { defaultSystemPreferences, getSystemPreferences } from "@/lib/system-preferences";
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
  let systemPreferences = defaultSystemPreferences;
  let activeWorkspaceIdForObservability = workspaceId;

  if (user) {
    try {
      const activeWorkspaceId = workspaceId ?? (await ensureDefaultWorkspace(supabase, user));
      activeWorkspaceIdForObservability = activeWorkspaceId;

      const [
        workspaceResult,
        personalProfileResult,
        systemPreferencesResult,
        accountsCountResult,
        transactionsCountResult,
        subscriptionResult
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
          getSystemPreferences(supabase, user.id, activeWorkspaceId),
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
            .maybeSingle<SubscriptionSummaryRow>()
        ]);

      systemPreferences = systemPreferencesResult;
      const activeFinancialAlerts = await syncActiveFinancialAlerts({
        locale: systemPreferences.language,
        preferences: systemPreferences,
        supabase,
        workspaceId: activeWorkspaceId
      });

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
        subscriptionResult.error
      ) {
        connectionStatus = connectionStatus === "disconnected" ? "disconnected" : "attention";
      }

      for (const alert of activeFinancialAlerts) {
        notices.push({
          description: alert.body,
          dismissId: alert.id,
          href: alert.href ?? undefined,
          id: `financial-alert-${alert.id}`,
          title: alert.title,
          tone: alert.severity
        });
      }

      if (systemPreferences.inAppNotificationsEnabled && !personalProfileResult.data) {
        notices.push({
          id: "profile-recommended",
          tone: "warning",
          title: "Perfil pessoal recomendado.",
          description:
            "Complete seu perfil para o sistema adaptar metas e recomendações.",
          href: "/personal-profile"
        });
      }

      if (systemPreferences.inAppNotificationsEnabled && (accountsCountResult.count ?? 0) === 0) {
        notices.push({
          id: "first-wallet",
          tone: "warning",
          title: "Crie sua primeira carteira.",
          description: "Cadastre sua conta bancária ou carteira física para iniciar seu controle.",
          href: "/accounts"
        });
      }

      if (systemPreferences.inAppNotificationsEnabled && (transactionsCountResult.count ?? 0) === 0) {
        notices.push({
          id: "first-transaction",
          tone: "info",
          title: "Registre seu primeiro movimento.",
          description: "Seu painel ganha previsão assim que os primeiros lançamentos entram.",
          href: "/transactions/new"
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

  if (!notices.length && systemPreferences.inAppNotificationsEnabled) {
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
      <ObservabilityTracker
        enabled={Boolean(user)}
        workspaceId={activeWorkspaceIdForObservability}
      />
    </div>
  );
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
