import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SupportAiAssistant } from "@/components/support-ai-assistant";
import {
  getTicketOperationalNextStep,
  getTicketSla,
  normalizeSupportTopic,
  normalizeTicketStatus,
  parseSupportDescription,
  supportTopicLabels,
  ticketAreaLabels,
  ticketPriorityLabels,
  ticketStatusLabels,
  type TicketArea,
  type TicketPriority,
  type TicketStatus
} from "@/lib/support";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { createSupportTicket } from "@/app/support/actions";

type SupportSearchParams = {
  question?: string;
  error?: string;
  q?: string;
  status?: string;
  success?: string;
  topic?: string;
};

type SupportTicketRow = {
  area: TicketArea;
  created_at: string;
  description: string;
  first_response_due_at: string | null;
  id: string;
  next_response_due_at: string | null;
  priority: TicketPriority;
  requester_email: string | null;
  status: TicketStatus;
  title: string;
  updated_at: string;
};

type SupportNotificationRow = {
  body: string;
  created_at: string;
  id: string;
  kind: string;
  read_at: string | null;
  ticket_id: string | null;
  title: string;
};

export default async function SupportPage({
  searchParams
}: {
  searchParams: Promise<SupportSearchParams>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const params = await searchParams;
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  const query = String(params.q ?? "").trim().toLowerCase();
  const selectedStatus = normalizeTicketStatus(params.status);
  const selectedTopic = normalizeSupportTopic(params.topic);
  const triageQuestion = String(params.question ?? "").trim();

  const ticketsResult = await supabase
    .from("saas_support_tickets")
    .select(
      "id,requester_email,title,description,area,priority,status,created_at,updated_at,first_response_due_at,next_response_due_at"
    )
    .eq("requester_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50)
    .returns<SupportTicketRow[]>();

  const notificationsResult = await supabase
    .from("saas_support_notifications")
    .select("id,ticket_id,kind,title,body,read_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6)
    .returns<SupportNotificationRow[]>();

  const supportTickets = ticketsResult.data ?? [];
  const notifications = notificationsResult.data ?? [];
  const filteredTickets = supportTickets.filter((ticket) => {
    const matchesStatus = selectedStatus === "all" || ticket.status === selectedStatus;
    const matchesQuery =
      !query ||
      `${ticket.id} ${ticket.title} ${ticket.description} ${ticket.area}`
        .toLowerCase()
        .includes(query);

    return matchesStatus && matchesQuery;
  });
  const openCount = supportTickets.filter((ticket) => ticket.status === "open").length;
  const inProgressCount = supportTickets.filter((ticket) => ticket.status === "in_progress").length;
  const waitingCount = supportTickets.filter((ticket) => ticket.status === "waiting").length;
  const unreadNotifications = notifications.filter((notification) => !notification.read_at).length;

  return (
    <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
      <section className="module-page support-workspace">
        <div className="module-hero panel support-hero">
          <div>
            <p className="section-label">Atendimento inteligente</p>
            <h2>Chat e Suporte</h2>
            <p className="supporting-copy">
              Primeiro a IA tenta resolver. Se precisar de análise técnica, o Deniaros organiza
              o contexto e abre um ticket com histórico, prioridade, SLA e acompanhamento.
            </p>
          </div>
          <div className="profile-badges">
            <span className="status-chip">{hasGeminiKey ? "IA configurada" : "IA pendente"}</span>
            <span className="status-chip">{openCount + inProgressCount} em atendimento</span>
            <span className="status-chip">{waitingCount} aguardando</span>
            <span className="status-chip">{unreadNotifications} aviso(s)</span>
          </div>
        </div>

        {params.error ? <p className="form-error">{params.error}</p> : null}
        {params.success ? <p className="form-success">{params.success}</p> : null}

        {ticketsResult.error ? (
          <section className="source-banner">
            <strong>Histórico de suporte temporariamente indisponível</strong>
            <span>
              Não conseguimos carregar ou gravar tickets agora. A conversa com a IA continua disponível.
            </span>
          </section>
        ) : null}

        <section className="support-ops-grid" aria-label="Resumo operacional do suporte">
          <article className="panel support-ops-card">
            <p className="section-label">Fila</p>
            <strong>{openCount}</strong>
            <span>precisam da primeira resposta</span>
          </article>
          <article className="panel support-ops-card">
            <p className="section-label">Em análise</p>
            <strong>{inProgressCount}</strong>
            <span>assumidos pelo suporte</span>
          </article>
          <article className="panel support-ops-card">
            <p className="section-label">Com você</p>
            <strong>{waitingCount}</strong>
            <span>aguardam seu retorno</span>
          </article>
          <article className="panel support-ops-card">
            <p className="section-label">Notificações</p>
            <strong>{unreadNotifications}</strong>
            <span>não lidas</span>
          </article>
        </section>

        {notifications.length ? (
          <section className="panel support-notification-panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Notificações</p>
                <h3>Atualizações recentes</h3>
              </div>
              <span className="status-chip">{unreadNotifications} nova(s)</span>
            </div>
            <div className="support-notification-list">
              {notifications.map((notification) => (
                <Link
                  className={notification.read_at ? "support-notification read" : "support-notification"}
                  href={notification.ticket_id ? `/support/tickets/${notification.ticket_id}` : "/support"}
                  key={notification.id}
                >
                  <strong>{notification.title}</strong>
                  <span>{notification.body}</span>
                  <small>{formatDateTime(notification.created_at)}</small>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="support-entry-grid" aria-label="Escolha o tipo de ajuda">
          <article className="support-entry-card natural">
            <div>
              <p className="section-label">Conversa financeira</p>
              <h3>Fale com a IA como no WhatsApp</h3>
              <p>
                Pergunte sobre saldo, dívidas, hábitos, previsão e decisões. Ela usa o contexto do
                seu Deniaros sem transformar tudo em ticket.
              </p>
            </div>
            <Link className="primary-button" href="/assistant">
              Abrir Consultor IA
            </Link>
          </article>

          <article className="support-entry-card technical">
            <div>
              <p className="section-label">Problema ou atendimento</p>
              <h3>Precisa de suporte?</h3>
              <p>
                Descreva o problema, receba uma orientação inicial e abra um ticket com histórico
                quando precisar de análise técnica.
              </p>
            </div>
            <a className="ghost-button" href="#ai-chat">
              Resolver aqui
            </a>
          </article>
        </section>

        <SupportAiAssistant
          createTicketAction={createSupportTicket}
          hasGeminiKey={hasGeminiKey}
          initialQuestion={triageQuestion}
          initialTopic={selectedTopic}
          topicLabels={supportTopicLabels}
        />

        <section className="support-flow-grid" aria-label="Como o suporte funciona">
          <article className="panel support-flow-card">
            <span>1</span>
            <strong>Pergunte com contexto</strong>
            <p>Descreva a tela, o objetivo e o que aconteceu. A IA entende melhor quando recebe o cenário completo.</p>
          </article>
          <article className="panel support-flow-card">
            <span>2</span>
            <strong>Resolva ou encaminhe</strong>
            <p>Se for algo de uso, ela orienta o caminho. Se for técnico, o ticket já nasce com histórico.</p>
          </article>
          <article className="panel support-flow-card">
            <span>3</span>
            <strong>Acompanhe tudo aqui</strong>
            <p>Os tickets ficam salvos com prioridade, prazo de resposta e conversa em um só lugar.</p>
          </article>
        </section>

        <section className="support-ticket-tools">
          <form className="support-search-form" method="get">
            <label>
              Buscar tickets
              <input defaultValue={params.q ?? ""} name="q" placeholder="Buscar por título, área ou número" />
            </label>
            <label>
              Status
              <select defaultValue={selectedStatus} name="status">
                <option value="all">Todos os status</option>
                {Object.entries(ticketStatusLabels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="ghost-button" type="submit">
              Filtrar
            </button>
          </form>
          <Link className="primary-button" href="#ticket-form">
            Abrir ticket de suporte
          </Link>
        </section>

        <section className="support-ticket-list" aria-label="Tickets de suporte">
          {filteredTickets.length ? (
            filteredTickets.map((ticket) => {
              const parsedDescription = parseSupportDescription(ticket.description);
              const sla = getTicketSla(ticket);

              return (
                <article className="panel support-ticket-card" key={ticket.id}>
                  <div className="support-ticket-meta">
                    <span className={`support-priority ${ticket.priority}`}>
                      {ticketPriorityLabels[ticket.priority]}
                    </span>
                    <span>{ticketAreaLabels[ticket.area]}</span>
                    <span className={`support-sla-chip ${sla.className}`}>{sla.label}</span>
                    <span>#{ticket.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="support-ticket-body">
                    <div>
                      <h3>{ticket.title}</h3>
                      <p>{parsedDescription.message}</p>
                      <small>
                        Solicitante: {ticket.requester_email ?? user.email} · Atualizado{" "}
                        {formatDate(ticket.updated_at)} · {sla.meta} · {getTicketOperationalNextStep(ticket)}
                      </small>
                    </div>
                    <span className={`support-ticket-status ${ticket.status}`}>
                      {ticketStatusLabels[ticket.status]}
                    </span>
                  </div>
                  <div className="support-ticket-card-actions">
                    <Link className="ghost-button" href={`/support/tickets/${ticket.id}`}>
                      Abrir histórico
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <article className="panel empty-state">
              <strong>Nenhum ticket encontrado.</strong>
              <p>Ajuste a busca ou abra um novo atendimento para acompanhar por aqui.</p>
            </article>
          )}
        </section>

        <section className="panel support-ticket-form-panel" id="ticket-form">
          <div className="panel-header">
            <div>
              <p className="section-label">Novo atendimento</p>
              <h3>Abrir ticket de suporte</h3>
            </div>
            <span className="status-chip">Entra no Admin SaaS</span>
          </div>
          <form action={createSupportTicket} className="entity-form profile-form">
            <label>
              Assunto
              <input
                name="title"
                placeholder="Ex.: Erro ao baixar conta recorrente"
                required
              />
            </label>
            <label>
              Área
              <select defaultValue="technical" name="area">
                <option value="technical">Técnico</option>
                <option value="feature">Funcionalidade</option>
                <option value="billing">Assinatura</option>
                <option value="guidance">Orientação de uso</option>
                <option value="account">Conta e acesso</option>
              </select>
            </label>
            <label>
              Prioridade
              <select defaultValue="medium" name="priority">
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </label>
            <label className="wide-field">
              Descrição
              <textarea
                name="description"
                placeholder="Explique o que aconteceu, o que esperava e em qual tela estava."
                required
                rows={5}
              />
            </label>
            <p className="micro-copy wide-field">
              O ticket será salvo no seu workspace e aparecerá na fila do Painel Admin SaaS.
            </p>
            <div className="form-actions">
              <button className="ghost-button" type="reset">
                Limpar
              </button>
              <button className="primary-button" type="submit">
                Abrir ticket
              </button>
            </div>
          </form>
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
