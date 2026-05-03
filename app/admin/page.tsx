import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAdminAccess } from "@/lib/admin-auth";
import { getAdminRoleLabel, hasAdminPermission } from "@/lib/admin-permissions";
import { formatCurrency } from "@/lib/finance";
import {
  buildObservabilitySummary,
  type ObservabilityEventRow
} from "@/lib/observability";
import {
  getTicketSla,
  getTicketStatusClass,
  parseSupportDescription,
  sortTicketsByAttention,
  translateTicketArea,
  translateTicketPriority,
  translateTicketStatus,
  type TicketPriority,
  type TicketStatus
} from "@/lib/support";
import { getWorkspaceContext } from "@/lib/workspace-context";
import {
  updateFeatureFlag,
  updateSupportTicket,
  upsertSubscription
} from "@/app/admin/actions";

type AdminSearchParams = {
  error?: string;
  plan?: string;
  q?: string;
  status?: string;
  success?: string;
};

type WorkspaceRow = {
  created_at: string;
  id: string;
  name: string;
  owner_id: string;
  type: "personal" | "family" | "business";
};

type ProfileRow = {
  display_name: string | null;
  user_id: string;
  username: string | null;
};

type PlanRow = {
  billing_interval: "month" | "year" | "manual";
  features: Record<string, unknown>;
  id: string;
  is_active: boolean;
  is_public: boolean;
  limits: Record<string, unknown>;
  name: string;
  price_cents: number;
  tier: string;
};

type SubscriptionRow = {
  current_period_ends_at: string | null;
  id: string;
  notes: string | null;
  plan_id: string;
  seats: number;
  status: "trialing" | "active" | "past_due" | "canceled" | "suspended" | "manual";
  trial_ends_at: string | null;
  user_id: string;
  workspace_id: string | null;
};

type FeatureFlagRow = {
  allowed_plan_ids: string[];
  description: string | null;
  id: string;
  is_enabled: boolean;
  name: string;
  rollout_plan: string;
};

type SupportTicketRow = {
  area: string;
  created_at: string;
  description: string;
  id: string;
  priority: TicketPriority;
  requester_email: string | null;
  status: TicketStatus;
  title: string;
  updated_at: string;
  workspace_id: string | null;
};

type AdminAuditEventRow = {
  action: string;
  actor_role: string | null;
  created_at: string;
  id: string;
  target_type: string;
  workspace_id: string | null;
};

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const params = await searchParams;
  const { error, success } = params;
  const query = String(params.q ?? "").trim();
  const statusFilter = normalizeFilter(params.status, "all");
  const planFilter = normalizeFilter(params.plan, "all");
  const access = await getAdminAccess(supabase, user);
  const canManageSubscriptions = hasAdminPermission(access.role, "manage_subscriptions");
  const canManageFlags = hasAdminPermission(access.role, "manage_feature_flags");
  const canManageSupport = hasAdminPermission(access.role, "manage_support");
  const canManageAdmins = hasAdminPermission(access.role, "manage_admins");

  if (!access.allowed) {
    return (
      <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
        <section className="module-page admin-workspace">
          <div className="module-hero panel">
            <div>
              <p className="section-label">Área privada</p>
              <h2>Painel administrativo</h2>
              <p className="supporting-copy">
                Este painel gerencia assinantes, planos, suporte e operação do SaaS. Seu usuário
                ainda não tem permissão administrativa.
              </p>
            </div>
          </div>
          <section className="panel">
            <p className="section-label">Bootstrap</p>
            <h3>Como liberar seu acesso</h3>
            <p className="supporting-copy">
              Execute a migration <code>0014_saas_admin_foundation.sql</code> e cadastre seu
              usuário na tabela <code>admin_users</code> com papel <code>founder</code>.
            </p>
          </section>
        </section>
      </AppShell>
    );
  }

  const [
    workspacesResult,
    plansResult,
    subscriptionsResult,
    flagsResult,
    ticketsResult,
    adminAuditResult,
    observabilityResult
  ] = await Promise.all([
      supabase
        .from("workspaces")
        .select("id,owner_id,name,type,created_at")
        .order("created_at", { ascending: false })
        .limit(250)
        .returns<WorkspaceRow[]>(),
      supabase
        .from("saas_plans")
        .select("id,name,tier,price_cents,billing_interval,is_public,is_active,limits,features")
        .order("price_cents", { ascending: true })
        .returns<PlanRow[]>(),
      supabase
        .from("saas_subscriptions")
        .select(
          "id,workspace_id,user_id,plan_id,status,seats,trial_ends_at,current_period_ends_at,notes"
        )
        .order("updated_at", { ascending: false })
        .returns<SubscriptionRow[]>(),
      supabase
        .from("feature_flags")
        .select("id,name,description,is_enabled,rollout_plan,allowed_plan_ids")
        .order("name", { ascending: true })
        .returns<FeatureFlagRow[]>(),
      supabase
        .from("saas_support_tickets")
        .select(
          "id,workspace_id,requester_email,title,description,area,priority,status,created_at,updated_at"
        )
        .order("updated_at", { ascending: false })
        .limit(20)
        .returns<SupportTicketRow[]>(),
      supabase
        .from("admin_audit_events")
        .select("id,workspace_id,target_type,action,actor_role,created_at")
        .order("created_at", { ascending: false })
        .limit(8)
        .returns<AdminAuditEventRow[]>(),
      supabase
        .from("app_observability_events")
        .select("created_at,event_name,event_type,severity,source,route,user_id,workspace_id,properties")
        .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1500)
        .returns<ObservabilityEventRow[]>()
    ]);

  const workspaceRows = workspacesResult.data ?? [];
  const plans = plansResult.data ?? [];
  const subscriptions = subscriptionsResult.data ?? [];
  const flags = flagsResult.data ?? [];
  const tickets = ticketsResult.data ?? [];
  const adminAuditEvents = adminAuditResult.data ?? [];
  const observabilityEvents = observabilityResult.data ?? [];
  const rawSubscriptionByWorkspaceId = new Map(
    subscriptions
      .filter((subscription) => subscription.workspace_id)
      .map((subscription) => [subscription.workspace_id as string, subscription])
  );
  const workspaces = dedupeAdminWorkspaces(workspaceRows, rawSubscriptionByWorkspaceId);
  const hiddenDuplicateWorkspaceCount = Math.max(0, workspaceRows.length - workspaces.length);
  const ownerIds = Array.from(new Set(workspaces.map((workspace) => workspace.owner_id))).filter(
    Boolean
  );
  const profilesResult = ownerIds.length
    ? await supabase
        .from("user_profiles")
        .select("user_id,display_name,username")
        .in("user_id", ownerIds)
        .returns<ProfileRow[]>()
    : { data: [] as ProfileRow[], error: null };
  const profiles = profilesResult.data ?? [];
  const loadError =
    workspacesResult.error ||
    profilesResult.error ||
    plansResult.error ||
    subscriptionsResult.error ||
    flagsResult.error ||
    ticketsResult.error ||
    adminAuditResult.error ||
    observabilityResult.error;
  const profileByUserId = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const subscriptionByWorkspaceId = rawSubscriptionByWorkspaceId;
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const subscriptionCountByPlanId = new Map<string, number>();
  let publicMrr = 0;
  let trialCount = 0;
  let atRiskCount = 0;
  let activeSubscriptionCount = 0;

  for (const subscription of subscriptions) {
    subscriptionCountByPlanId.set(
      subscription.plan_id,
      (subscriptionCountByPlanId.get(subscription.plan_id) ?? 0) + 1
    );

    if (subscription.status === "trialing") {
      trialCount += 1;
    }

    if (subscription.status === "past_due" || subscription.status === "suspended") {
      atRiskCount += 1;
    }

    if (subscription.status === "active" || subscription.status === "manual") {
      activeSubscriptionCount += 1;
    }

    if (subscription.status === "active" || subscription.status === "trialing" || subscription.status === "manual") {
      const plan = planById.get(subscription.plan_id);
      const price = Number(plan?.price_cents ?? 0);

      if (plan?.billing_interval === "year") {
        publicMrr += price / 12;
      } else if (plan?.billing_interval === "month") {
        publicMrr += price;
      }
    }
  }

  let openTicketCount = 0;
  let waitingTicketCount = 0;
  let urgentTicketCount = 0;

  for (const ticket of tickets) {
    if (ticket.status === "open") {
      openTicketCount += 1;
    }
    if (ticket.status === "waiting") {
      waitingTicketCount += 1;
    }
    if (ticket.priority === "urgent") {
      urgentTicketCount += 1;
    }
  }

  let enabledFlagsCount = 0;

  for (const flag of flags) {
    if (flag.is_enabled) {
      enabledFlagsCount += 1;
    }
  }

  const privatePlanCount = plans.reduce((count, plan) => count + (plan.is_public ? 0 : 1), 0);
  const customerHealth = subscriptions.length
    ? Math.round((activeSubscriptionCount / subscriptions.length) * 100)
    : 0;
  const observabilitySummary = buildObservabilitySummary(observabilityEvents);
  const normalizedQuery = query.toLowerCase();
  const filteredWorkspaces = workspaces.filter((workspace) => {
    const profile = profileByUserId.get(workspace.owner_id);
    const subscription = subscriptionByWorkspaceId.get(workspace.id);
    const haystack = [
      workspace.name,
      workspace.type,
      workspace.owner_id,
      profile?.display_name,
      profile?.username,
      subscription?.plan_id,
      subscription?.status
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
    const matchesStatus =
      statusFilter === "all" || statusFilter === (subscription?.status ?? "none");
    const matchesPlan = planFilter === "all" || planFilter === (subscription?.plan_id ?? "none");
    return matchesQuery && matchesStatus && matchesPlan;
  });
  const planMix = plans
    .map((plan) => ({
      count: subscriptionCountByPlanId.get(plan.id) ?? 0,
      plan
    }))
    .filter((entry) => entry.count > 0 || !entry.plan.is_public);
  const latestTickets = sortTicketsByAttention(tickets).slice(0, 6);
  const adminActionCards = [
    {
      href: "#admin-support-queue",
      label: "Atendimentos",
      metric: openTicketCount + waitingTicketCount,
      status: urgentTicketCount ? `${urgentTicketCount} urgente(s)` : "Fila sob controle",
      text: "Priorize tickets abertos e aguardando retorno antes que virem atrito.",
      tone: openTicketCount + waitingTicketCount ? "risk" : "stable"
    },
    {
      href: "/admin?status=past_due",
      label: "Receita em risco",
      metric: atRiskCount,
      status: `${customerHealth}% de saúde`,
      text: "Acompanhe assinaturas pendentes ou suspensas e aja antes do churn.",
      tone: atRiskCount ? "risk" : "stable"
    },
    {
      href: "#admin-plans-flags",
      label: "Planos e flags",
      metric: enabledFlagsCount,
      status: `${privatePlanCount} plano(s) privado(s)`,
      text: "Controle liberações por plano, betas e acesso privado Platinum.",
      tone: "info"
    },
    {
      href: "#admin-audit",
      label: "Auditoria",
      metric: adminAuditEvents.length,
      status: "Últimas ações",
      text: "Revise mudanças críticas de assinatura, suporte e flags.",
      tone: "neutral"
    },
    {
      href: "#admin-observability",
      label: "Observabilidade",
      metric: observabilitySummary.criticalErrors,
      status: `${observabilitySummary.activationScore}% ativação`,
      text: "Veja funil, erros de produção e rotas que indicam tração real.",
      tone: observabilitySummary.criticalErrors ? "risk" : "stable"
    },
    {
      href: "/admin/permissions",
      label: "Permissões",
      metric: canManageAdmins ? 1 : 0,
      status: canManageAdmins ? "Founder ativo" : "Somente leitura",
      text: "Gerencie founders, admins, suporte e financeiro com auditoria.",
      tone: canManageAdmins ? "stable" : "info"
    }
  ];

  return (
    <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
      <section className="module-page admin-workspace">
        <div className="admin-hero panel">
          <div>
            <p className="section-label">Centro de comando SaaS</p>
            <h2>Painel administrativo</h2>
            <p className="supporting-copy">
              Gerencie assinantes, planos, liberações privadas, tickets e sinais de operação do
              Deniaros em um só lugar.
            </p>
          </div>
          <div className="admin-hero-aside">
            <span className="status-chip admin-role-chip">{getAdminRoleLabel(access.role)}</span>
            <strong>{formatCurrency(publicMrr / 100, "BRL", "pt-BR")}</strong>
            <span>MRR estimado</span>
            <Link className="ghost-button" href="/settings">
              Configurações
            </Link>
          </div>
        </div>

        {access.bootstrapHint ? (
          <section className="source-banner">
            <strong>Acesso parcialmente configurado</strong>
            <span>{access.bootstrapHint}</span>
          </section>
        ) : null}

        {loadError ? (
          <section className="source-banner">
            <strong>Base administrativa indisponível</strong>
            <span>
              Execute a migration 0014_saas_admin_foundation.sql e confirme seu registro em
              admin_users.
            </span>
          </section>
        ) : null}

        {hiddenDuplicateWorkspaceCount ? (
          <section className="source-banner">
            <strong>Duplicatas técnicas ocultadas</strong>
            <span>
              Encontramos {workspaceRows.length} workspace(s) na base e exibimos {workspaces.length}
              assinante(s) consolidado(s). A migration 0026 limpa duplicatas vazias e evita novos
              registros repetidos.
            </span>
          </section>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        <section className="admin-permission-strip">
          <span>
            <strong>{getAdminRoleLabel(access.role)}</strong>
            Papel ativo nesta sessão
          </span>
          <span className={canManageSubscriptions ? "enabled" : ""}>Assinaturas</span>
          <span className={canManageFlags ? "enabled" : ""}>Feature flags</span>
          <span className={canManageSupport ? "enabled" : ""}>Suporte</span>
          <span className={canManageAdmins ? "enabled" : ""}>Permissões</span>
        </section>

        <section className="admin-command-grid" aria-label="Próximas ações do painel administrativo">
          {adminActionCards.map((card) => (
            <article className={`panel admin-command-card ${card.tone}`} key={card.label}>
              <div>
                <p className="section-label">{card.label}</p>
                <strong>{card.metric}</strong>
                <span>{card.status}</span>
              </div>
              <p>{card.text}</p>
              <Link className="ghost-button" href={card.href}>
                Ver agora
              </Link>
            </article>
          ))}
        </section>

        <div className="admin-kpi-grid">
          <article className="panel admin-kpi-card kpi-revenue">
            <p className="section-label">MRR estimado</p>
            <strong>{formatCurrency(publicMrr / 100, "BRL", "pt-BR")}</strong>
            <p>Planos mensais e anuais rateados. Planos manuais privados não entram no cálculo.</p>
          </article>
          <article className="panel admin-kpi-card">
            <p className="section-label">Clientes</p>
            <strong>{workspaces.length}</strong>
            <p>{customerHealth}% com assinatura ativa ou manual.</p>
          </article>
          <article className="panel admin-kpi-card">
            <p className="section-label">Trials</p>
            <strong>{trialCount}</strong>
            <p>Usuários em validação comercial.</p>
          </article>
          <article className="panel admin-kpi-card kpi-alert">
            <p className="section-label">Atenção</p>
            <strong>{atRiskCount + openTicketCount}</strong>
            <p>{atRiskCount} assinatura(s) em risco e {openTicketCount} ticket(s) aberto(s).</p>
          </article>
        </div>

        <section className="panel admin-filter-panel">
          <form className="admin-filter-form">
            <label>
              Buscar assinante
              <input defaultValue={query} name="q" placeholder="Nome, usuário, workspace ou ID" />
            </label>
            <label>
              Status
              <select defaultValue={statusFilter} name="status">
                <option value="all">Todos os status</option>
                <option value="none">Sem assinatura</option>
                <option value="trialing">Trial</option>
                <option value="active">Ativa</option>
                <option value="manual">Manual</option>
                <option value="past_due">Pagamento pendente</option>
                <option value="suspended">Suspensa</option>
                <option value="canceled">Cancelada</option>
              </select>
            </label>
            <label>
              Plano
              <select defaultValue={planFilter} name="plan">
                <option value="all">Todos os planos</option>
                <option value="none">Sem plano</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                    {!plan.is_public ? " (privado)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" type="submit">
              Filtrar
            </button>
            <Link className="ghost-button" href="/admin">
              Limpar
            </Link>
          </form>
        </section>

        <section className="panel admin-subscriber-panel" id="admin-subscribers">
          <div className="panel-header">
            <div>
              <p className="section-label">Assinantes</p>
              <h3>Workspaces e plano ativo</h3>
            </div>
            <span className="status-chip">
              {filteredWorkspaces.length} de {workspaces.length}
            </span>
          </div>

          <div className="admin-subscriber-list">
            {filteredWorkspaces.length ? (
              filteredWorkspaces.map((workspace) => {
                const profile = profileByUserId.get(workspace.owner_id);
                const subscription = subscriptionByWorkspaceId.get(workspace.id);
                const activePlan = subscription ? planById.get(subscription.plan_id) : undefined;

                return (
                  <article className="admin-subscriber-card" key={workspace.id}>
                    <div className="admin-subscriber-main">
                      <span className="admin-avatar">{workspace.name.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <strong>{workspace.name}</strong>
                        <p className="micro-copy">
                          {profile?.display_name ?? profile?.username ?? "Cliente sem perfil"} ·{" "}
                          {translateWorkspaceType(workspace.type)} · desde{" "}
                          {formatDate(workspace.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="admin-subscriber-state">
                      <span className="status-chip">{activePlan?.name ?? "Sem plano"}</span>
                      <span className={`status-chip ${getStatusClass(subscription?.status)}`}>
                        {translateSubscriptionStatus(subscription?.status)}
                      </span>
                      <span className="admin-next-step">
                        {getSubscriberNextAction(subscription?.status)}
                      </span>
                      <Link className="ghost-button admin-detail-link" href={`/admin/subscribers/${workspace.id}`}>
                        Abrir
                      </Link>
                    </div>

                    <form action={upsertSubscription} className="admin-inline-form">
                      <input name="returnTo" type="hidden" value="/admin" />
                      <input name="workspaceId" type="hidden" value={workspace.id} />
                      <input name="userId" type="hidden" value={workspace.owner_id} />
                      <select
                        aria-label={`Plano de ${workspace.name}`}
                        defaultValue={subscription?.plan_id ?? "free"}
                        disabled={!canManageSubscriptions}
                        name="planId"
                      >
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                            {!plan.is_public ? " (privado)" : ""}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label={`Status de ${workspace.name}`}
                        defaultValue={subscription?.status ?? "trialing"}
                        disabled={!canManageSubscriptions}
                        name="status"
                      >
                        <option value="trialing">Trial</option>
                        <option value="active">Ativa</option>
                        <option value="manual">Manual</option>
                        <option value="past_due">Pagamento pendente</option>
                        <option value="suspended">Suspensa</option>
                        <option value="canceled">Cancelada</option>
                      </select>
                      <input
                        aria-label={`Observação interna de ${workspace.name}`}
                        defaultValue={subscription?.notes ?? ""}
                        disabled={!canManageSubscriptions}
                        name="notes"
                        placeholder="Observação interna"
                      />
                      {canManageSubscriptions ? (
                        <button className="primary-button" type="submit">
                          Salvar
                        </button>
                      ) : (
                        <span className="status-chip status-muted">Somente leitura</span>
                      )}
                    </form>
                  </article>
                );
              })
            ) : (
              <article className="empty-state">
                <strong>Nenhum assinante encontrado.</strong>
                <p>Ajuste os filtros ou confirme as policies administrativas da migration 0014.</p>
              </article>
            )}
          </div>
        </section>

        <div className="admin-ops-grid" id="admin-plans-flags">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Planos</p>
                <h3>Oferta, limite e distribuição</h3>
              </div>
            </div>
            <div className="admin-plan-grid">
              {plans.map((plan) => {
                const assignedCount = subscriptionCountByPlanId.get(plan.id) ?? 0;
                return (
                  <article className="admin-plan-card" key={plan.id}>
                    <div className="record-headline">
                      <div>
                        <strong>{plan.name}</strong>
                        <p className="micro-copy">
                          {plan.tier} · {plan.is_public ? "público" : "privado"} ·{" "}
                          {plan.billing_interval === "manual"
                            ? "liberação manual"
                            : formatCurrency(plan.price_cents / 100, "BRL", "pt-BR")}
                        </p>
                      </div>
                      <span className="status-chip">{plan.is_active ? "Ativo" : "Pausado"}</span>
                    </div>
                    <div className="admin-plan-meter" aria-hidden="true">
                      <span style={{ width: `${Math.min(100, assignedCount * 18)}%` }} />
                    </div>
                    <p className="micro-copy">
                      {assignedCount} assinatura(s) · Limites: {formatJsonSummary(plan.limits)}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Feature flags</p>
                <h3>Liberações controladas</h3>
              </div>
            </div>
            <div className="record-list admin-flag-list">
              {flags.map((flag) => (
                <article className="record-card" key={flag.id}>
                  <div className="record-headline">
                    <div>
                      <strong>{flag.name}</strong>
                      <p className="micro-copy">{flag.description ?? "Sem descrição"}</p>
                    </div>
                    <span className="status-chip">{flag.is_enabled ? "Ligada" : "Desligada"}</span>
                  </div>
                  <form action={updateFeatureFlag} className="entity-form compact-form">
                    <input name="returnTo" type="hidden" value="/admin" />
                    <input name="flagId" type="hidden" value={flag.id} />
                    <label className="checkbox-row">
                      <span>Ativar flag</span>
                      <input
                        defaultChecked={flag.is_enabled}
                        disabled={!canManageFlags}
                        name="isEnabled"
                        type="checkbox"
                      />
                    </label>
                    <label>
                      Rollout
                      <select
                        defaultValue={flag.rollout_plan}
                        disabled={!canManageFlags}
                        name="rolloutPlan"
                      >
                        <option value="manual">Manual</option>
                        <option value="plan_based">Por plano</option>
                        <option value="beta">Beta</option>
                      </select>
                    </label>
                    <div className="form-actions">
                      {canManageFlags ? (
                        <button className="primary-button" type="submit">
                          Salvar flag
                        </button>
                      ) : (
                        <span className="status-chip status-muted">Somente leitura</span>
                      )}
                    </div>
                  </form>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="panel" id="admin-support-queue">
          <div className="panel-header">
            <div>
              <p className="section-label">Suporte</p>
              <h3>Fila de atenção</h3>
            </div>
            <span className="status-chip">{tickets.length} ticket(s)</span>
          </div>
          <div className="admin-ticket-list">
            {latestTickets.length ? (
              latestTickets.map((ticket) => {
                const parsedDescription = parseSupportDescription(ticket.description);
                const sla = getTicketSla(ticket);

                return (
                  <article className="record-card" key={ticket.id}>
                    <div className="record-headline">
                      <div>
                        <strong>{ticket.title}</strong>
                        <p className="micro-copy">
                          {ticket.requester_email ?? "sem e-mail"} · {translateTicketArea(ticket.area)} · atualizado{" "}
                          {formatDate(ticket.updated_at)}
                        </p>
                        <p>{parsedDescription.message}</p>
                      </div>
                      <div className="record-badge-row">
                        <span className="status-chip">{translateTicketPriority(ticket.priority)}</span>
                        <span className={`support-sla-chip ${sla.className}`}>{sla.label}</span>
                        <span className={`status-chip ${getTicketStatusClass(ticket.status)}`}>
                          {translateTicketStatus(ticket.status)}
                        </span>
                        <Link className="ghost-button admin-detail-link" href={`/admin/tickets/${ticket.id}`}>
                          Abrir
                        </Link>
                      </div>
                    </div>
                    <p className="micro-copy support-queue-sla">{sla.meta}</p>
                    <form action={updateSupportTicket} className="entity-form compact-form">
                      <input name="returnTo" type="hidden" value="/admin" />
                      <input name="ticketId" type="hidden" value={ticket.id} />
                      <label>
                        Prioridade
                        <select
                          defaultValue={ticket.priority}
                          disabled={!canManageSupport}
                          name="priority"
                        >
                          <option value="low">Baixa</option>
                          <option value="medium">Média</option>
                          <option value="high">Alta</option>
                          <option value="urgent">Urgente</option>
                        </select>
                      </label>
                      <label>
                        Status
                        <select
                          defaultValue={ticket.status}
                          disabled={!canManageSupport}
                          name="status"
                        >
                          <option value="open">Aberto</option>
                          <option value="waiting">Aguardando</option>
                          <option value="resolved">Resolvido</option>
                          <option value="closed">Fechado</option>
                        </select>
                      </label>
                      <div className="form-actions">
                        {canManageSupport ? (
                          <button className="primary-button" type="submit">
                            Atualizar ticket
                          </button>
                        ) : (
                          <span className="status-chip status-muted">Somente leitura</span>
                        )}
                      </div>
                    </form>
                  </article>
                );
              })
            ) : (
              <article className="empty-state">
                <strong>Nenhum ticket real ainda.</strong>
                <p>Quando o suporte persistente for conectado, os tickets entrarão nesta fila.</p>
              </article>
            )}
          </div>
        </section>

        <section className="panel admin-observability-panel" id="admin-observability">
          <div className="panel-header">
            <div>
              <p className="section-label">Observabilidade</p>
              <h3>Funil, erros e ativação</h3>
            </div>
            <span className="status-chip">
              {observabilitySummary.eventsLast24Hours} evento(s) em 24h
            </span>
          </div>

          <div className="admin-observability-kpis">
            <article>
              <span>Ativação média</span>
              <strong>{observabilitySummary.activationScore}%</strong>
            </article>
            <article>
              <span>Usuários ativos em 7 dias</span>
              <strong>{observabilitySummary.uniqueUsers7Days}</strong>
            </article>
            <article>
              <span>Workspaces ativos em 7 dias</span>
              <strong>{observabilitySummary.uniqueWorkspaces7Days}</strong>
            </article>
            <article className={observabilitySummary.criticalErrors ? "risk" : "stable"}>
              <span>Erros de produção</span>
              <strong>{observabilitySummary.criticalErrors}</strong>
            </article>
          </div>

          <div className="admin-observability-grid">
            <article className="admin-observability-card">
              <div className="record-headline">
                <div>
                  <strong>Funil de ativação</strong>
                  <p className="micro-copy">Baseado em navegação autenticada dos últimos 7 dias.</p>
                </div>
              </div>
              <div className="admin-funnel-list">
                {observabilitySummary.funnel.map((step) => (
                  <div key={step.key}>
                    <span>
                      {step.label}
                      <strong>{step.count}</strong>
                    </span>
                    <div className="admin-funnel-meter" aria-hidden="true">
                      <i style={{ width: `${step.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="admin-observability-card">
              <div className="record-headline">
                <div>
                  <strong>Rotas mais acessadas</strong>
                  <p className="micro-copy">Ajuda a enxergar onde o produto cria hábito.</p>
                </div>
              </div>
              <div className="admin-route-list">
                {observabilitySummary.topRoutes.length ? (
                  observabilitySummary.topRoutes.map((route) => (
                    <span key={route.route}>
                      <code>{route.route}</code>
                      <strong>{route.count}</strong>
                    </span>
                  ))
                ) : (
                  <p className="micro-copy">Sem navegação registrada ainda.</p>
                )}
              </div>
            </article>

            <article className="admin-observability-card">
              <div className="record-headline">
                <div>
                  <strong>Últimos erros</strong>
                  <p className="micro-copy">Falhas capturadas por navegador e error boundary.</p>
                </div>
              </div>
              <div className="admin-error-list">
                {observabilitySummary.latestErrors.length ? (
                  observabilitySummary.latestErrors.map((event) => (
                    <span key={`${event.created_at}-${event.event_name}-${event.route ?? "sem-rota"}`}>
                      <strong>{event.event_name}</strong>
                      <small>
                        {formatDate(event.created_at)} · {event.route ?? "sem rota"} · {event.severity}
                      </small>
                    </span>
                  ))
                ) : (
                  <p className="micro-copy">Nenhum erro capturado nos últimos 14 dias.</p>
                )}
              </div>
            </article>
          </div>
        </section>

        <section className="panel" id="admin-audit">
          <div className="panel-header">
            <div>
              <p className="section-label">Auditoria administrativa</p>
              <h3>Últimas alterações no SaaS</h3>
            </div>
            <span className="status-chip">{adminAuditEvents.length} evento(s)</span>
          </div>
          <div className="admin-timeline-list compact">
            {adminAuditEvents.length ? (
              adminAuditEvents.map((event) => (
                <article key={event.id}>
                  <span>{formatDate(event.created_at)}</span>
                  <div>
                    <strong>{translateAdminAuditAction(event.action)}</strong>
                    <p className="micro-copy">
                      {event.actor_role ?? "admin"} · {translateAdminTarget(event.target_type)}
                      {event.workspace_id ? " · workspace vinculado" : ""}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <article className="empty-state">
                <strong>Nenhum evento administrativo ainda.</strong>
                <p>A próxima alteração feita no painel será registrada aqui.</p>
              </article>
            )}
          </div>
        </section>

        {planMix.length ? (
          <section className="admin-insight-strip" aria-label="Resumo de distribuição por plano">
            {planMix.map(({ plan, count }) => (
              <span key={plan.id}>
                <strong>{count}</strong> {plan.name}
              </span>
            ))}
          </section>
        ) : null}
      </section>
    </AppShell>
  );
}

function dedupeAdminWorkspaces(
  workspaces: WorkspaceRow[],
  subscriptionByWorkspaceId: Map<string, SubscriptionRow>
) {
  const bestBySubscriberKey = new Map<string, WorkspaceRow>();

  for (const workspace of workspaces) {
    const key = [
      workspace.owner_id,
      workspace.type,
      workspace.name.trim().toLowerCase()
    ].join(":");
    const current = bestBySubscriberKey.get(key);

    if (!current || getWorkspaceDisplayScore(workspace, subscriptionByWorkspaceId) > getWorkspaceDisplayScore(current, subscriptionByWorkspaceId)) {
      bestBySubscriberKey.set(key, workspace);
    }
  }

  return Array.from(bestBySubscriberKey.values()).sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

function getWorkspaceDisplayScore(
  workspace: WorkspaceRow,
  subscriptionByWorkspaceId: Map<string, SubscriptionRow>
) {
  const subscription = subscriptionByWorkspaceId.get(workspace.id);
  const hasSubscription = subscription ? 10000 : 0;
  const activeSubscription =
    subscription?.status === "active" || subscription?.status === "manual" ? 2000 : 0;
  const namedWorkspace = workspace.name.trim().toLowerCase() === "meu deniaros" ? 0 : 500;
  const recency = Math.min(new Date(workspace.created_at).getTime() / 1000000000, 999);

  return hasSubscription + activeSubscription + namedWorkspace + recency;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatJsonSummary(value: Record<string, unknown>) {
  return Object.entries(value)
    .slice(0, 5)
    .map(([key, entry]) => `${key}: ${entry}`)
    .join(" · ");
}

function getStatusClass(status?: SubscriptionRow["status"]) {
  if (status === "active" || status === "manual") {
    return "status-stable";
  }
  if (status === "trialing") {
    return "status-info";
  }
  if (status === "past_due" || status === "suspended") {
    return "status-risk";
  }
  if (status === "canceled") {
    return "status-muted";
  }
  return "";
}

function getSubscriberNextAction(status?: SubscriptionRow["status"]) {
  const labels: Record<SubscriptionRow["status"] | "none", string> = {
    active: "Acompanhar uso",
    canceled: "Reativar ou arquivar",
    manual: "Revisar liberação",
    none: "Criar assinatura",
    past_due: "Recuperar pagamento",
    suspended: "Decidir bloqueio",
    trialing: "Converter trial"
  };
  return labels[status ?? "none"];
}

function normalizeFilter(value: unknown, fallback: string) {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function translateAdminAuditAction(action: string) {
  const labels: Record<string, string> = {
    admin_access_changed: "Acesso administrativo alterado",
    feature_flag_changed: "Feature flag alterada",
    subscription_changed: "Assinatura alterada",
    support_ticket_changed: "Ticket alterado",
    workspace_reviewed: "Workspace revisado"
  };
  return labels[action] ?? action;
}

function translateAdminTarget(targetType: string) {
  const labels: Record<string, string> = {
    admin_user: "Admin",
    feature_flag: "Feature flag",
    subscription: "Assinatura",
    support_ticket: "Ticket",
    workspace: "Workspace"
  };
  return labels[targetType] ?? targetType;
}

function translateSubscriptionStatus(status?: SubscriptionRow["status"]) {
  const labels = {
    active: "Ativa",
    canceled: "Cancelada",
    manual: "Manual",
    past_due: "Pagamento pendente",
    suspended: "Suspensa",
    trialing: "Trial"
  };
  return status ? labels[status] : "Sem assinatura";
}

function translateWorkspaceType(type: WorkspaceRow["type"]) {
  const labels = {
    business: "Empresa",
    family: "Família",
    personal: "Pessoal"
  };
  return labels[type];
}
