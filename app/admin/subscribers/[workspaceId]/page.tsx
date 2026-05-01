import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAdminAccess } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { formatCurrency } from "@/lib/finance";
import { resolvePlanVisualTier } from "@/lib/saas-plans";
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
import { updateSupportTicket, upsertSubscription } from "@/app/admin/actions";

type DetailParams = {
  workspaceId: string;
};

type DetailSearchParams = {
  error?: string;
  success?: string;
};

type WorkspaceRow = {
  base_currency: string;
  country_code: string;
  created_at: string;
  id: string;
  locale: string;
  name: string;
  owner_id: string;
  time_zone: string;
  type: "personal" | "family" | "business";
  updated_at: string;
};

type ProfileRow = {
  avatar_url: string | null;
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
  current_period_starts_at: string | null;
  id: string;
  notes: string | null;
  plan_id: string;
  seats: number;
  status: "trialing" | "active" | "past_due" | "canceled" | "suspended" | "manual";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
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

type AccountRow = {
  currency: string;
  id: string;
  is_active: boolean;
  name: string;
  opening_balance: number;
  type: string;
  updated_at: string;
};

type TransactionRow = {
  amount: number;
  created_at: string;
  currency: string;
  description: string;
  id: string;
  occurred_on: string;
  source: string;
  status: string;
};

type ScheduledItemRow = {
  amount: number;
  currency: string;
  due_on: string;
  id: string;
  kind: "bill" | "deposit" | "transfer";
  status: string;
  title: string;
};

type ImportBatchRow = {
  created_at: string;
  duplicate_count: number;
  id: string;
  imported_count: number;
  original_filename: string | null;
  row_count: number;
  source_type: string;
  status: string;
};

type AuditEventRow = {
  created_at: string;
  event_type: string;
  id: string;
  note: string | null;
  source: string;
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
};

type AdminAuditEventRow = {
  action: string;
  actor_role: string | null;
  after_state: Record<string, unknown> | null;
  before_state: Record<string, unknown> | null;
  created_at: string;
  id: string;
  target_type: string;
};

export default async function SubscriberDetailPage({
  params,
  searchParams
}: {
  params: Promise<DetailParams>;
  searchParams: Promise<DetailSearchParams>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const access = await getAdminAccess(supabase, user);
  const { workspaceId: targetWorkspaceId } = await params;
  const { error, success } = await searchParams;
  const returnTo = `/admin/subscribers/${targetWorkspaceId}`;
  const canManageSubscriptions = hasAdminPermission(access.role, "manage_subscriptions");
  const canManageSupport = hasAdminPermission(access.role, "manage_support");

  if (!access.allowed) {
    return (
      <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
        <section className="module-page admin-workspace">
          <section className="panel">
            <p className="section-label">Área privada</p>
            <h2>Acesso administrativo necessário</h2>
            <p className="supporting-copy">Seu usuário ainda não pode visualizar assinantes.</p>
          </section>
        </section>
      </AppShell>
    );
  }

  const workspaceResult = await supabase
    .from("workspaces")
    .select("id,owner_id,name,type,base_currency,locale,time_zone,country_code,created_at,updated_at")
    .eq("id", targetWorkspaceId)
    .maybeSingle<WorkspaceRow>();
  const workspace = workspaceResult.data;

  if (!workspace) {
    return (
      <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
        <section className="module-page admin-workspace">
          <section className="panel">
            <p className="section-label">Assinante</p>
            <h2>Workspace não encontrado</h2>
            <p className="supporting-copy">
              Verifique se o ID existe e se a migration administrativa já foi aplicada.
            </p>
            <Link className="ghost-button" href="/admin">
              Voltar ao painel
            </Link>
          </section>
        </section>
      </AppShell>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const [
    profileResult,
    plansResult,
    subscriptionResult,
    flagsResult,
    accountsResult,
    recentTransactionsResult,
    upcomingItemsResult,
    importBatchesResult,
    auditEventsResult,
    adminAuditResult,
    ticketsResult,
    transactionsCountResult,
    scheduledCountResult,
    importCountResult
  ] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("user_id,display_name,username,avatar_url")
      .eq("user_id", workspace.owner_id)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("saas_plans")
      .select("id,name,tier,price_cents,billing_interval,is_public,is_active,limits,features")
      .order("price_cents", { ascending: true })
      .returns<PlanRow[]>(),
    supabase
      .from("saas_subscriptions")
      .select(
        "id,workspace_id,user_id,plan_id,status,seats,trial_ends_at,current_period_starts_at,current_period_ends_at,stripe_customer_id,stripe_subscription_id,notes"
      )
      .eq("workspace_id", workspace.id)
      .maybeSingle<SubscriptionRow>(),
    supabase
      .from("feature_flags")
      .select("id,name,description,is_enabled,rollout_plan,allowed_plan_ids")
      .order("name", { ascending: true })
      .returns<FeatureFlagRow[]>(),
    supabase
      .from("accounts")
      .select("id,name,type,currency,opening_balance,is_active,updated_at")
      .eq("workspace_id", workspace.id)
      .order("updated_at", { ascending: false })
      .limit(8)
      .returns<AccountRow[]>(),
    supabase
      .from("transactions")
      .select("id,description,amount,currency,occurred_on,status,source,created_at")
      .eq("workspace_id", workspace.id)
      .order("occurred_on", { ascending: false })
      .limit(8)
      .returns<TransactionRow[]>(),
    supabase
      .from("scheduled_items")
      .select("id,title,amount,currency,due_on,kind,status")
      .eq("workspace_id", workspace.id)
      .gte("due_on", today)
      .order("due_on", { ascending: true })
      .limit(8)
      .returns<ScheduledItemRow[]>(),
    supabase
      .from("import_batches")
      .select("id,source_type,original_filename,row_count,imported_count,duplicate_count,status,created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<ImportBatchRow[]>(),
    supabase
      .from("transaction_audit_events")
      .select("id,event_type,source,note,created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<AuditEventRow[]>(),
    supabase
      .from("admin_audit_events")
      .select("id,target_type,action,actor_role,before_state,after_state,created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<AdminAuditEventRow[]>(),
    supabase
      .from("saas_support_tickets")
      .select("id,requester_email,title,description,area,priority,status,created_at,updated_at")
      .eq("workspace_id", workspace.id)
      .order("updated_at", { ascending: false })
      .limit(8)
      .returns<SupportTicketRow[]>(),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    supabase
      .from("scheduled_items")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id),
    supabase.from("import_batches").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id)
  ]);

  const profile = profileResult.data;
  const plans = plansResult.data ?? [];
  const subscription = subscriptionResult.data;
  const flags = flagsResult.data ?? [];
  const accounts = accountsResult.data ?? [];
  const recentTransactions = recentTransactionsResult.data ?? [];
  const upcomingItems = upcomingItemsResult.data ?? [];
  const importBatches = importBatchesResult.data ?? [];
  const auditEvents = auditEventsResult.data ?? [];
  const adminAuditEvents = adminAuditResult.data ?? [];
  const tickets = sortTicketsByAttention(ticketsResult.data ?? []);
  const plan = plans.find((entry) => entry.id === subscription?.plan_id);
  const planTier = resolvePlanVisualTier(plan?.id ?? subscription?.plan_id, plan?.tier);
  const loadErrors = [
    workspaceResult.error,
    profileResult.error,
    plansResult.error,
    subscriptionResult.error,
    flagsResult.error,
    accountsResult.error,
    recentTransactionsResult.error,
    upcomingItemsResult.error,
    importBatchesResult.error,
    auditEventsResult.error,
    adminAuditResult.error,
    ticketsResult.error,
    transactionsCountResult.error,
    scheduledCountResult.error,
    importCountResult.error
  ].filter(Boolean);
  const activeFlags = flags.filter((flag) => {
    if (!flag.is_enabled) {
      return false;
    }
    return !plan?.id || flag.allowed_plan_ids.length === 0 || flag.allowed_plan_ids.includes(plan.id);
  });
  const openTickets = tickets.filter((ticket) => ["open", "waiting"].includes(ticket.status)).length;
  const urgentTickets = tickets.filter((ticket) => ticket.priority === "urgent").length;
  const activeAccounts = accounts.filter((account) => account.is_active).length;
  const totalOpeningBalance = accounts.reduce(
    (total, account) => total + Number(account.opening_balance ?? 0),
    0
  );
  const recentVolume = recentTransactions.reduce(
    (total, transaction) => total + Math.abs(Number(transaction.amount ?? 0)),
    0
  );
  const subscriberHealthScore = calculateSubscriberHealth({
    hasRecentTransactions: recentTransactions.length > 0,
    openTickets,
    status: subscription?.status,
    totalAccounts: accounts.length,
    totalScheduled: scheduledCountResult.count ?? 0,
    urgentTickets
  });
  const nextCommercialDate = subscription?.current_period_ends_at ?? subscription?.trial_ends_at;
  const subscriberActionCards = [
    {
      label: "Saúde do cliente",
      metric: `${subscriberHealthScore}%`,
      status: getSubscriberHealthLabel(subscriberHealthScore),
      text: getSubscriberHealthText(subscriberHealthScore, subscription?.status, openTickets),
      tone: getSubscriberHealthTone(subscriberHealthScore)
    },
    {
      label: "Próxima ação",
      metric: getSubscriberNextAction(subscription?.status, openTickets),
      status: nextCommercialDate ? formatDate(nextCommercialDate) : "Sem data comercial",
      text: "Use essa leitura para decidir cobrança, liberação privada, acompanhamento ou suporte.",
      tone: openTickets || subscription?.status === "past_due" || subscription?.status === "suspended" ? "risk" : "info"
    },
    {
      label: "Uso financeiro",
      metric: activeAccounts,
      status: `${transactionsCountResult.count ?? 0} lançamento(s)`,
      text: `${formatCurrency(totalOpeningBalance, workspace.base_currency, "pt-BR")} em saldos iniciais e ${formatCurrency(
        recentVolume,
        workspace.base_currency,
        "pt-BR"
      )} em volume recente.`,
      tone: recentTransactions.length ? "stable" : "neutral"
    }
  ];

  return (
    <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
      <section className="module-page admin-workspace admin-detail-page">
        <div className={`admin-detail-hero panel admin-detail-hero-${planTier}`}>
          <div>
            <Link className="micro-copy admin-back-link" href="/admin">
              Voltar ao painel
            </Link>
            <p className="section-label">Assinante</p>
            <h2>{workspace.name}</h2>
            <p className="supporting-copy">
              {profile?.display_name ?? profile?.username ?? "Cliente sem perfil"} ·{" "}
              {translateWorkspaceType(workspace.type)} · {workspace.base_currency} · criado em{" "}
              {formatDate(workspace.created_at)}
            </p>
          </div>
          <div className={`admin-detail-status admin-plan-status-${planTier}`}>
            <span className={`status-chip ${getSubscriptionStatusClass(subscription?.status)}`}>
              {translateSubscriptionStatus(subscription?.status)}
            </span>
            <strong>{plan?.name ?? "Sem plano"}</strong>
            <span>{plan ? formatPlanPrice(plan) : "Plano ainda não configurado"}</span>
            <span className={`admin-health-pill ${getSubscriberHealthTone(subscriberHealthScore)}`}>
              Saúde {subscriberHealthScore}%
            </span>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        {loadErrors.length ? (
          <section className="source-banner">
            <strong>Leitura operacional parcial</strong>
            <span>
              Aplique a migration 0015_admin_read_operational_data.sql para liberar a visão
              completa do assinante.
            </span>
          </section>
        ) : null}

        <section className="admin-subscriber-health-grid" aria-label="Resumo executivo do assinante">
          {subscriberActionCards.map((card) => (
            <article className={`panel admin-subscriber-health-card ${card.tone}`} key={card.label}>
              <p className="section-label">{card.label}</p>
              <strong>{card.metric}</strong>
              <span>{card.status}</span>
              <p>{card.text}</p>
            </article>
          ))}
        </section>

        <div className="admin-detail-kpis">
          <article className="panel admin-kpi-card">
            <p className="section-label">Movimentos</p>
            <strong>{transactionsCountResult.count ?? 0}</strong>
            <p>Total de lançamentos registrados no workspace.</p>
          </article>
          <article className="panel admin-kpi-card">
            <p className="section-label">Agenda</p>
            <strong>{scheduledCountResult.count ?? 0}</strong>
            <p>Contas, depósitos e compromissos cadastrados.</p>
          </article>
          <article className="panel admin-kpi-card">
            <p className="section-label">Importações</p>
            <strong>{importCountResult.count ?? 0}</strong>
            <p>Lotes importados para conciliação e auditoria.</p>
          </article>
          <article className="panel admin-kpi-card kpi-alert">
            <p className="section-label">Atenção</p>
            <strong>{openTickets}</strong>
            <p>Tickets abertos ou aguardando resposta.</p>
          </article>
        </div>

        <div className="admin-detail-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Assinatura</p>
                <h3>Plano, status e observação</h3>
              </div>
              {subscription?.stripe_subscription_id ? (
                <span className="status-chip">Stripe conectado</span>
              ) : (
                <span className="status-chip">Manual</span>
              )}
            </div>
            <form action={upsertSubscription} className="entity-form compact-form">
              <input name="returnTo" type="hidden" value={returnTo} />
              <input name="workspaceId" type="hidden" value={workspace.id} />
              <input name="userId" type="hidden" value={workspace.owner_id} />
              <label>
                Plano
                <select
                  defaultValue={subscription?.plan_id ?? "free"}
                  disabled={!canManageSubscriptions}
                  name="planId"
                >
                  {plans.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                      {!entry.is_public ? " (privado)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
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
              </label>
              <label className="wide-field">
                Observação interna
                <input
                  defaultValue={subscription?.notes ?? ""}
                  disabled={!canManageSubscriptions}
                  name="notes"
                  placeholder="Ex.: cliente fundador, negociação especial, risco de churn"
                />
              </label>
              <div className="form-actions">
                {canManageSubscriptions ? (
                  <button className="primary-button" type="submit">
                    Atualizar assinatura
                  </button>
                ) : (
                  <span className="status-chip status-muted">Somente leitura</span>
                )}
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Perfil operacional</p>
                <h3>Workspace e dono</h3>
              </div>
            </div>
            <dl className="admin-detail-list">
              <div>
                <dt>Dono</dt>
                <dd>{profile?.display_name ?? profile?.username ?? workspace.owner_id}</dd>
              </div>
              <div>
                <dt>Tipo</dt>
                <dd>{translateWorkspaceType(workspace.type)}</dd>
              </div>
              <div>
                <dt>Localidade</dt>
                <dd>
                  {workspace.locale} · {workspace.time_zone} · {workspace.country_code}
                </dd>
              </div>
              <div>
                <dt>Atualizado</dt>
                <dd>{formatDate(workspace.updated_at)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="admin-detail-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Uso financeiro</p>
                <h3>Contas do cliente</h3>
              </div>
              <span className="status-chip">{accounts.length} exibida(s)</span>
            </div>
            <div className="admin-compact-list">
              {accounts.length ? (
                accounts.map((account) => (
                  <article key={account.id}>
                    <div>
                      <strong>{account.name}</strong>
                      <p className="micro-copy">
                        {account.type} · {account.currency} · {account.is_active ? "ativa" : "inativa"}
                      </p>
                    </div>
                    <span>{formatCurrency(Number(account.opening_balance), account.currency, "pt-BR")}</span>
                  </article>
                ))
              ) : (
                <p className="micro-copy">Nenhuma conta visível para este workspace.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Liberações</p>
                <h3>Flags ativas para o plano</h3>
              </div>
            </div>
            <div className="admin-flag-cloud">
              {activeFlags.length ? (
                activeFlags.map((flag) => (
                  <span className="status-chip" key={flag.id} title={flag.description ?? flag.name}>
                    {flag.name}
                  </span>
                ))
              ) : (
                <p className="micro-copy">Nenhuma flag ativa para o plano atual.</p>
              )}
            </div>
          </section>
        </div>

        <div className="admin-detail-grid wide-left">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Atividade recente</p>
                <h3>Últimos lançamentos</h3>
              </div>
            </div>
            <div className="admin-timeline-list">
              {recentTransactions.length ? (
                recentTransactions.map((transaction) => (
                  <article key={transaction.id}>
                    <span>{formatDate(transaction.occurred_on)}</span>
                    <div>
                      <strong>{transaction.description}</strong>
                      <p className="micro-copy">
                        {transaction.source} · {transaction.status} ·{" "}
                        {formatCurrency(Number(transaction.amount), transaction.currency, "pt-BR")}
                      </p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="micro-copy">Nenhum lançamento recente encontrado.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Agenda</p>
                <h3>Próximos compromissos</h3>
              </div>
            </div>
            <div className="admin-compact-list">
              {upcomingItems.length ? (
                upcomingItems.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <p className="micro-copy">
                        {formatDate(item.due_on)} · {translateScheduleKind(item.kind)} · {item.status}
                      </p>
                    </div>
                    <span>{formatCurrency(Number(item.amount), item.currency, "pt-BR")}</span>
                  </article>
                ))
              ) : (
                <p className="micro-copy">Nenhum compromisso futuro encontrado.</p>
              )}
            </div>
          </section>
        </div>

        <div className="admin-detail-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Importações</p>
                <h3>Lotes recentes</h3>
              </div>
            </div>
            <div className="admin-compact-list">
              {importBatches.length ? (
                importBatches.map((batch) => (
                  <article key={batch.id}>
                    <div>
                      <strong>{batch.original_filename ?? batch.source_type}</strong>
                      <p className="micro-copy">
                        {formatDate(batch.created_at)} · {batch.status} · {batch.imported_count}/
                        {batch.row_count} importados
                      </p>
                    </div>
                    <span>{batch.duplicate_count} duplicado(s)</span>
                  </article>
                ))
              ) : (
                <p className="micro-copy">Nenhum lote de importação encontrado.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Auditoria</p>
                <h3>Eventos financeiros</h3>
              </div>
            </div>
            <div className="admin-timeline-list compact">
              {auditEvents.length ? (
                auditEvents.map((event) => (
                  <article key={event.id}>
                    <span>{formatDate(event.created_at)}</span>
                    <div>
                      <strong>{translateAuditEvent(event.event_type)}</strong>
                      <p className="micro-copy">{event.note ?? event.source}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="micro-copy">Nenhum evento de auditoria encontrado.</p>
              )}
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Auditoria administrativa</p>
              <h3>Alterações feitas no painel</h3>
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
                      {summarizeAdminChange(event) ? ` · ${summarizeAdminChange(event)}` : ""}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <article className="empty-state">
                <strong>Nenhuma alteração administrativa ainda.</strong>
                <p>Quando plano, ticket ou liberação forem alterados, o histórico aparecerá aqui.</p>
              </article>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Suporte</p>
              <h3>Tickets deste assinante</h3>
            </div>
            <span className="status-chip">{tickets.length} ticket(s)</span>
          </div>
          <div className="admin-ticket-list">
            {tickets.length ? (
              tickets.map((ticket) => {
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
                      <input name="returnTo" type="hidden" value={returnTo} />
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
                <strong>Nenhum ticket deste assinante.</strong>
                <p>Quando o suporte persistente for conectado, eles aparecerão aqui.</p>
              </article>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatPlanPrice(plan: PlanRow) {
  if (plan.billing_interval === "manual") {
    return "Liberação manual";
  }
  const interval = plan.billing_interval === "year" ? "ano" : "mês";
  return `${formatCurrency(plan.price_cents / 100, "BRL", "pt-BR")} / ${interval}`;
}

function getSubscriptionStatusClass(status?: SubscriptionRow["status"]) {
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

function calculateSubscriberHealth({
  hasRecentTransactions,
  openTickets,
  status,
  totalAccounts,
  totalScheduled,
  urgentTickets
}: {
  hasRecentTransactions: boolean;
  openTickets: number;
  status?: SubscriptionRow["status"];
  totalAccounts: number;
  totalScheduled: number;
  urgentTickets: number;
}) {
  let score = 84;

  if (status === "active" || status === "manual") {
    score += 8;
  }
  if (status === "trialing") {
    score -= 4;
  }
  if (status === "past_due") {
    score -= 28;
  }
  if (status === "suspended" || status === "canceled" || !status) {
    score -= 36;
  }
  if (!hasRecentTransactions) {
    score -= 12;
  }
  if (totalAccounts === 0) {
    score -= 12;
  }
  if (totalScheduled === 0) {
    score -= 6;
  }
  score -= openTickets * 5;
  score -= urgentTickets * 10;

  return Math.max(0, Math.min(100, score));
}

function getSubscriberHealthLabel(score: number) {
  if (score >= 82) {
    return "Estável";
  }
  if (score >= 62) {
    return "Acompanhar";
  }
  return "Requer atenção";
}

function getSubscriberHealthText(
  score: number,
  status?: SubscriptionRow["status"],
  openTickets = 0
) {
  if (status === "past_due" || status === "suspended") {
    return "Risco comercial ativo. Resolva cobrança ou liberação antes de novas mudanças.";
  }
  if (openTickets > 0) {
    return "Há atendimento em aberto. Priorize resposta para reduzir atrito.";
  }
  if (score >= 82) {
    return "Cliente saudável. Bom candidato para expansão, feedback ou plano superior.";
  }
  return "Uso ou status pedem acompanhamento próximo nos próximos dias.";
}

function getSubscriberHealthTone(score: number) {
  if (score >= 82) {
    return "stable";
  }
  if (score >= 62) {
    return "info";
  }
  return "risk";
}

function getSubscriberNextAction(status?: SubscriptionRow["status"], openTickets = 0) {
  if (openTickets > 0) {
    return "Responder suporte";
  }
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

function translateAuditEvent(type: string) {
  const labels: Record<string, string> = {
    imported_deleted: "Importação removida",
    imported_posted: "Importação lançada",
    imported_rule_applied: "Regra aplicada",
    manual_adjustment: "Ajuste manual",
    scheduled_deleted: "Agenda removida",
    scheduled_settled: "Agenda liquidada",
    scheduled_updated: "Agenda atualizada",
    transaction_created: "Lançamento criado",
    transaction_deleted: "Lançamento removido",
    transaction_updated: "Lançamento atualizado"
  };
  return labels[type] ?? type;
}

function summarizeAdminChange(event: AdminAuditEventRow) {
  if (event.action === "subscription_changed") {
    const beforePlan = event.before_state?.plan_id;
    const afterPlan = event.after_state?.plan_id;
    const beforeStatus = event.before_state?.status;
    const afterStatus = event.after_state?.status;
    if (beforePlan !== afterPlan) {
      return `plano ${String(beforePlan ?? "novo")} → ${String(afterPlan ?? "sem plano")}`;
    }
    if (beforeStatus !== afterStatus) {
      return `status ${String(beforeStatus ?? "novo")} → ${String(afterStatus ?? "sem status")}`;
    }
  }

  if (event.action === "support_ticket_changed") {
    const beforeStatus = event.before_state?.status;
    const afterStatus = event.after_state?.status;
    if (beforeStatus !== afterStatus) {
      return `ticket ${String(beforeStatus ?? "novo")} → ${String(afterStatus ?? "sem status")}`;
    }
  }

  return null;
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

function translateScheduleKind(kind: ScheduledItemRow["kind"]) {
  const labels = {
    bill: "Conta a pagar",
    deposit: "Depósito",
    transfer: "Transferência"
  };
  return labels[kind];
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
