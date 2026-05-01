import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  getTicketSla,
  parseSupportDescription,
  ticketAreaLabels,
  ticketPriorityLabels,
  ticketStatusLabels,
  type TicketArea,
  type TicketPriority,
  type TicketStatus
} from "@/lib/support";
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
    .select("id,workspace_id,requester_id,requester_email,title,description,area,priority,status,created_at,updated_at")
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

  const messagesResult = await supabase
    .from("saas_support_ticket_messages")
    .select("id,author_role,visibility,body,created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true })
    .returns<TicketMessageRow[]>();
  const messages = messagesResult.data ?? [];
  const canReply = ticket.status === "open" || ticket.status === "waiting";
  const parsedDescription = parseSupportDescription(ticket.description);
  const sla = getTicketSla(ticket);

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
            <span>Aplique a migration 0018_support_ticket_messages.sql para habilitar respostas no ticket.</span>
          </section>
        ) : null}

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
