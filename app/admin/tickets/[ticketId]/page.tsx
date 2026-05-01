import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAdminAccess } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { formatCurrency } from "@/lib/finance";
import {
  getSupportResponseSuggestions,
  getTicketSla,
  getTicketStatusClass,
  parseSupportDescription,
  translateTicketArea,
  translateTicketPriority,
  translateTicketStatus,
  type TicketArea,
  type TicketPriority,
  type TicketStatus
} from "@/lib/support";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { createSupportTicketMessage, updateSupportTicket } from "@/app/admin/actions";

type TicketParams = {
  ticketId: string;
};

type TicketSearchParams = {
  error?: string;
  success?: string;
};

type SupportTicketRow = {
  area: TicketArea;
  created_at: string;
  description: string;
  id: string;
  priority: TicketPriority;
  requester_email: string | null;
  requester_id: string | null;
  status: TicketStatus;
  title: string;
  updated_at: string;
  workspace_id: string | null;
};

type TicketMessageRow = {
  author_role: "user" | "admin" | "system";
  body: string;
  created_at: string;
  id: string;
  visibility: "public" | "internal";
};

type WorkspaceRow = {
  base_currency: string;
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

type SubscriptionRow = {
  plan_id: string;
  status: string;
  workspace_id: string | null;
};

type PlanRow = {
  billing_interval: "month" | "year" | "manual";
  id: string;
  name: string;
  price_cents: number;
};

export default async function AdminTicketDetailPage({
  params,
  searchParams
}: {
  params: Promise<TicketParams>;
  searchParams: Promise<TicketSearchParams>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const access = await getAdminAccess(supabase, user);
  const canManageSupport = hasAdminPermission(access.role, "manage_support");
  const { ticketId } = await params;
  const { error, success } = await searchParams;
  const returnTo = `/admin/tickets/${ticketId}`;

  if (!access.allowed) {
    return (
      <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
        <section className="module-page admin-workspace">
          <section className="panel">
            <p className="section-label">Área privada</p>
            <h2>Acesso administrativo necessário</h2>
            <p className="supporting-copy">Seu usuário ainda não pode visualizar tickets.</p>
          </section>
        </section>
      </AppShell>
    );
  }

  const ticketResult = await supabase
    .from("saas_support_tickets")
    .select(
      "id,workspace_id,requester_id,requester_email,title,description,area,priority,status,created_at,updated_at"
    )
    .eq("id", ticketId)
    .maybeSingle<SupportTicketRow>();
  const ticket = ticketResult.data;

  if (!ticket) {
    return (
      <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
        <section className="module-page admin-workspace">
          <section className="panel">
            <p className="section-label">Ticket</p>
            <h2>Ticket não encontrado</h2>
            <p className="supporting-copy">Verifique se o ticket existe ou se a RLS está aplicada.</p>
            <Link className="ghost-button" href="/admin">
              Voltar ao painel
            </Link>
          </section>
        </section>
      </AppShell>
    );
  }

  const [
    messagesResult,
    workspaceResult,
    profileResult,
    subscriptionResult,
    plansResult
  ] = await Promise.all([
    supabase
      .from("saas_support_ticket_messages")
      .select("id,author_role,visibility,body,created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true })
      .returns<TicketMessageRow[]>(),
    ticket.workspace_id
      ? supabase
          .from("workspaces")
          .select("id,owner_id,name,type,base_currency,created_at")
          .eq("id", ticket.workspace_id)
          .maybeSingle<WorkspaceRow>()
      : Promise.resolve({ data: null, error: null }),
    ticket.requester_id
      ? supabase
          .from("user_profiles")
          .select("user_id,display_name,username")
          .eq("user_id", ticket.requester_id)
          .maybeSingle<ProfileRow>()
      : Promise.resolve({ data: null, error: null }),
    ticket.workspace_id
      ? supabase
          .from("saas_subscriptions")
          .select("workspace_id,plan_id,status")
          .eq("workspace_id", ticket.workspace_id)
          .maybeSingle<SubscriptionRow>()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("saas_plans")
      .select("id,name,price_cents,billing_interval")
      .returns<PlanRow[]>()
  ]);

  const messages = messagesResult.data ?? [];
  const workspace = workspaceResult.data;
  const profile = profileResult.data;
  const subscription = subscriptionResult.data;
  const plan = plansResult.data?.find((entry) => entry.id === subscription?.plan_id);
  const loadError =
    ticketResult.error ||
    messagesResult.error ||
    workspaceResult.error ||
    profileResult.error ||
    subscriptionResult.error ||
    plansResult.error;
  const parsedDescription = parseSupportDescription(ticket.description);
  const sla = getTicketSla(ticket);
  const responseSuggestions = getSupportResponseSuggestions(ticket.area);

  return (
    <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
      <section className="module-page admin-workspace admin-ticket-detail-page">
        <div className="admin-detail-hero panel">
          <div>
            <Link className="micro-copy admin-back-link" href="/admin">
              Voltar ao painel
            </Link>
            <p className="section-label">Ticket de suporte</p>
            <h2>{ticket.title}</h2>
            <p className="supporting-copy">
              {translateTicketArea(ticket.area)} · aberto em {formatDate(ticket.created_at)} ·
              atualizado {formatDate(ticket.updated_at)}
            </p>
          </div>
          <div className="admin-detail-status">
            <span className={`status-chip ${getTicketStatusClass(ticket.status)}`}>
              {translateTicketStatus(ticket.status)}
            </span>
            <strong>{translateTicketPriority(ticket.priority)}</strong>
            <span>Prioridade atual · {sla.meta}</span>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        {loadError ? (
          <section className="source-banner">
            <strong>Leitura parcial do ticket</strong>
            <span>Aplique a migration 0018_support_ticket_messages.sql para habilitar mensagens.</span>
          </section>
        ) : null}

        <div className="admin-detail-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Atendimento</p>
                <h3>Contexto recebido</h3>
              </div>
              <span className="status-chip">#{ticket.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="admin-ticket-description">
              <p>{parsedDescription.message}</p>
            </div>
            {parsedDescription.context ? (
              <div className="support-context-box">
                <p className="section-label">Contexto capturado pela triagem</p>
                <p>{parsedDescription.context}</p>
              </div>
            ) : null}
            <form action={updateSupportTicket} className="entity-form compact-form">
              <input name="returnTo" type="hidden" value={returnTo} />
              <input name="ticketId" type="hidden" value={ticket.id} />
              <label>
                Prioridade
                <select defaultValue={ticket.priority} disabled={!canManageSupport} name="priority">
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </label>
              <label>
                Status
                <select defaultValue={ticket.status} disabled={!canManageSupport} name="status">
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
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Assinante</p>
                <h3>Cliente vinculado</h3>
              </div>
            </div>
            <dl className="admin-detail-list">
              <div>
                <dt>Solicitante</dt>
                <dd>{profile?.display_name ?? profile?.username ?? ticket.requester_email ?? "Sem perfil"}</dd>
              </div>
              <div>
                <dt>Workspace</dt>
                <dd>{workspace?.name ?? "Sem workspace vinculado"}</dd>
              </div>
              <div>
                <dt>Plano</dt>
                <dd>{plan ? `${plan.name} · ${formatPlanPrice(plan)}` : "Sem plano"}</dd>
              </div>
              <div>
                <dt>Status SaaS</dt>
                <dd>{subscription?.status ?? "Sem assinatura"}</dd>
              </div>
              <div>
                <dt>SLA</dt>
                <dd>
                  <span className={`support-sla-chip ${sla.className}`}>{sla.label}</span>
                </dd>
              </div>
            </dl>
            {workspace ? (
              <Link className="ghost-button" href={`/admin/subscribers/${workspace.id}`}>
                Abrir assinante
              </Link>
            ) : null}
          </section>
        </div>

        <div className="admin-detail-grid wide-left">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Histórico</p>
                <h3>Mensagens e anotações</h3>
              </div>
              <span className="status-chip">{messages.length} registro(s)</span>
            </div>
            <div className="admin-ticket-message-list">
              <article className="ticket-message user-message">
                <div>
                  <strong>Solicitação inicial</strong>
                  <span>{formatDate(ticket.created_at)}</span>
                </div>
                <p>{parsedDescription.message}</p>
              </article>
              {messages.map((message) => (
                <article
                  className={`ticket-message ${message.author_role === "admin" ? "admin-message" : "user-message"} ${
                    message.visibility === "internal" ? "internal-message" : ""
                  }`}
                  key={message.id}
                >
                  <div>
                    <strong>
                      {message.visibility === "internal"
                        ? "Nota interna"
                        : message.author_role === "admin"
                          ? "Resposta do suporte"
                          : "Mensagem do usuário"}
                    </strong>
                    <span>{formatDate(message.created_at)}</span>
                  </div>
                  <p>{message.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Nova interação</p>
                <h3>Responder ou anotar</h3>
              </div>
            </div>
            <form action={createSupportTicketMessage} className="entity-form single-column-form">
              <input name="returnTo" type="hidden" value={returnTo} />
              <input name="ticketId" type="hidden" value={ticket.id} />
              <label>
                Tipo
                <select defaultValue="public" disabled={!canManageSupport} name="visibility">
                  <option value="public">Resposta visível ao usuário</option>
                  <option value="internal">Nota interna</option>
                </select>
              </label>
              <label>
                Mensagem
                <textarea
                  disabled={!canManageSupport}
                  name="body"
                  placeholder="Escreva a resposta ou registre uma nota interna para o time."
                  rows={7}
                />
              </label>
              <div className="form-actions">
                {canManageSupport ? (
                  <button className="primary-button" type="submit">
                    Registrar interação
                  </button>
                ) : (
                  <span className="status-chip status-muted">Somente leitura</span>
                )}
              </div>
            </form>
            <div className="support-reply-suggestions">
              <p className="section-label">Respostas rápidas</p>
              {responseSuggestions.map((suggestion) => (
                <article key={suggestion}>{suggestion}</article>
              ))}
            </div>
          </section>
        </div>
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
    return "liberação manual";
  }
  return `${formatCurrency(plan.price_cents / 100, "BRL", "pt-BR")} / ${
    plan.billing_interval === "year" ? "ano" : "mês"
  }`;
}
