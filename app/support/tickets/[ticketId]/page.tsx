import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  getTicketOperationalNextStep,
  getTicketSla,
  parseSupportDescription,
  ticketAreaLabels,
  ticketPriorityLabels,
  ticketStatusLabels,
  type TicketArea,
  type TicketPriority,
  type TicketStatus
} from "@/lib/support";
import { markSupportNotificationsRead } from "@/lib/support-operations";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { createUserSupportTicketMessage } from "@/app/support/actions";

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
  first_responded_at: string | null;
  first_response_due_at: string | null;
  id: string;
  next_response_due_at: string | null;
  priority: TicketPriority;
  requester_email: string | null;
  requester_id: string | null;
  resolved_at: string | null;
  status: TicketStatus;
  status_reason: string | null;
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

export default async function SupportTicketDetailPage({
  params,
  searchParams
}: {
  params: Promise<TicketParams>;
  searchParams: Promise<TicketSearchParams>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const { ticketId } = await params;
  const { error, success } = await searchParams;
  const returnTo = `/support/tickets/${ticketId}`;

  const ticketResult = await supabase
    .from("saas_support_tickets")
    .select(
      "id,workspace_id,requester_id,requester_email,title,description,area,priority,status,status_reason,created_at,updated_at,first_response_due_at,next_response_due_at,first_responded_at,resolved_at"
    )
    .eq("id", ticketId)
    .eq("requester_id", user.id)
    .maybeSingle<SupportTicketRow>();
  const ticket = ticketResult.data;

  if (!ticket) {
    return (
      <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
        <section className="module-page support-workspace">
          <section className="panel empty-state">
            <p className="section-label">Atendimento</p>
            <h2>Ticket não encontrado</h2>
            <p>Verifique se o ticket existe ou volte para sua central de suporte.</p>
            <Link className="ghost-button" href="/support">
              Voltar ao suporte
            </Link>
          </section>
        </section>
      </AppShell>
    );
  }

  await markSupportNotificationsRead(supabase, user.id, ticket.id);

  const messagesResult = await supabase
    .from("saas_support_ticket_messages")
    .select("id,author_role,visibility,body,created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true })
    .returns<TicketMessageRow[]>();
  const messages = messagesResult.data ?? [];
  const canReply = ticket.status === "open" || ticket.status === "in_progress" || ticket.status === "waiting";
  const parsedDescription = parseSupportDescription(ticket.description);
  const sla = getTicketSla(ticket);
  const nextStep = getTicketOperationalNextStep(ticket);

  return (
    <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
      <section className="module-page support-workspace support-ticket-detail-page">
        <div className="module-hero panel support-ticket-detail-hero">
          <div>
            <Link className="micro-copy admin-back-link" href="/support">
              Voltar ao suporte
            </Link>
            <p className="section-label">Atendimento #{ticket.id.slice(0, 8).toUpperCase()}</p>
            <h2>{ticket.title}</h2>
            <p className="supporting-copy">
              {ticketAreaLabels[ticket.area]} · aberto em {formatDate(ticket.created_at)} · atualizado{" "}
              {formatDate(ticket.updated_at)}
            </p>
          </div>
          <div className="support-ticket-detail-status">
            <span className={`support-ticket-status ${ticket.status}`}>{ticketStatusLabels[ticket.status]}</span>
            <span className={`support-priority ${ticket.priority}`}>
              Prioridade {ticketPriorityLabels[ticket.priority]}
            </span>
            <span className={`support-sla-chip ${sla.className}`}>{sla.label}</span>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        {ticketResult.error || messagesResult.error ? (
          <section className="source-banner">
            <strong>Histórico parcial</strong>
            <span>Aplique a migration de suporte operacional para habilitar respostas e notificações no ticket.</span>
          </section>
        ) : null}

        <section className="support-ticket-operation-strip">
          <article className="panel support-next-step">
            <p className="section-label">Próximo passo</p>
            <strong>{nextStep}</strong>
            {ticket.status_reason ? <span>{ticket.status_reason}</span> : null}
          </article>
          <article className="panel support-next-step">
            <p className="section-label">SLA</p>
            <strong>{sla.meta}</strong>
            <span>{ticket.next_response_due_at ? `Próximo retorno: ${formatDateTime(ticket.next_response_due_at)}` : sla.label}</span>
          </article>
        </section>

        <div className="support-ticket-detail-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Histórico público</p>
                <h3>Conversa do atendimento</h3>
              </div>
              <span className="status-chip">{messages.length + 1} registro(s)</span>
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
                  className={`ticket-message ${message.author_role === "admin" ? "admin-message" : "user-message"}`}
                  key={message.id}
                >
                  <div>
                    <strong>{message.author_role === "admin" ? "Resposta do suporte" : "Você"}</strong>
                    <span>{formatDate(message.created_at)}</span>
                  </div>
                  <p>{message.body}</p>
                </article>
              ))}
            </div>
          </section>

          <aside className="support-ticket-side-stack">
            <section className="panel support-ticket-reply-panel">
              <div className="panel-header">
                <div>
                  <p className="section-label">Responder</p>
                  <h3>{canReply ? "Adicionar mensagem" : "Atendimento finalizado"}</h3>
                </div>
              </div>
              {canReply ? (
                <form action={createUserSupportTicketMessage} className="entity-form single-column-form">
                  <input name="returnTo" type="hidden" value={returnTo} />
                  <input name="ticketId" type="hidden" value={ticket.id} />
                  <label>
                    Mensagem
                    <textarea
                      name="body"
                      placeholder="Envie uma atualização, print descrito ou contexto adicional para o suporte."
                      required
                      rows={7}
                    />
                  </label>
                  <div className="form-actions">
                    <button className="primary-button" type="submit">
                      Enviar mensagem
                    </button>
                  </div>
                </form>
              ) : (
                <p className="supporting-copy">
                  Este ticket está {ticketStatusLabels[ticket.status].toLowerCase()}. Abra um novo atendimento se
                  precisar continuar o assunto.
                </p>
              )}
            </section>

            <section className="panel support-ticket-summary-card">
              <p className="section-label">Resumo</p>
              <dl className="admin-detail-list">
                <div>
                  <dt>Área</dt>
                  <dd>{ticketAreaLabels[ticket.area]}</dd>
                </div>
                <div>
                  <dt>Prioridade</dt>
                  <dd>{ticketPriorityLabels[ticket.priority]}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{ticketStatusLabels[ticket.status]}</dd>
                </div>
                <div>
                  <dt>SLA</dt>
                  <dd>{sla.meta}</dd>
                </div>
                <div>
                  <dt>Primeira resposta</dt>
                  <dd>{ticket.first_responded_at ? formatDateTime(ticket.first_responded_at) : "Ainda pendente"}</dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>{ticket.requester_email ?? user.email ?? "Não informado"}</dd>
                </div>
              </dl>
            </section>

            {parsedDescription.context ? (
              <section className="panel support-ticket-summary-card">
                <p className="section-label">Contexto da IA</p>
                <p className="support-context-text">{parsedDescription.context}</p>
              </section>
            ) : null}
          </aside>
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
