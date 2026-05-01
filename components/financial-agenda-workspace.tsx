"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  createScheduledItem,
  deleteScheduledItem,
  settleScheduledItem,
  updateScheduledItem
} from "@/app/financial-agenda/actions";
import type {
  Account,
  Category,
  ForecastPoint,
  ForecastProjection,
  LocaleCode,
  Payee,
  ScheduledItem,
  Workspace
} from "@/lib/domain";
import {
  scheduleKindLabels,
  scheduleRecurrenceOptions,
  scheduleStatusLabels,
  scheduleStatusOptions
} from "@/lib/finance-admin";
import { formatCurrency, formatShortDate } from "@/lib/finance";

type AgendaWorkspaceProps = {
  accounts: Account[];
  auditEvents?: AgendaAuditEvent[];
  auditLoadError?: string;
  auditMigrationMissing?: boolean;
  categories: Category[];
  error?: string;
  items: ScheduledItem[];
  loadError?: string;
  payees: Payee[];
  projection: ForecastProjection;
  settledTransactions?: SettledAgendaTransaction[];
  success?: string;
  workspace: Workspace;
};

type AgendaAuditEvent = {
  after_status: string | null;
  before_status: string | null;
  created_at: string;
  event_type: "scheduled_settled" | "scheduled_updated" | "scheduled_deleted";
  id: string;
  metadata: Record<string, unknown>;
  note: string | null;
  transaction_id: string | null;
};

type SettledAgendaTransaction = {
  accountId: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  id: string;
  payeeId?: string;
  scheduledItemId?: string;
  scheduledOccurrenceDate?: string;
};

type CalendarMode = "year" | "month" | "week" | "day";

type CalendarEntry = {
  date: string;
  id: string;
  item: ScheduledItem;
};

type ModalState =
  | { mode: "create"; kind: ScheduledItem["kind"] }
  | { mode: "edit"; item: ScheduledItem }
  | null;

const weekdayLabels = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const emptyCalendarEntries: CalendarEntry[] = [];

export function FinancialAgendaWorkspace({
  accounts,
  auditEvents = [],
  auditLoadError,
  auditMigrationMissing = false,
  categories,
  error,
  items,
  loadError,
  payees,
  projection,
  settledTransactions = [],
  success,
  workspace
}: AgendaWorkspaceProps) {
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [anchorDate, setAnchorDate] = useState(() => normalizeDate(new Date()));
  const [modalState, setModalState] = useState<ModalState>(null);
  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const payeeById = useMemo(() => new Map(payees.map((payee) => [payee.id, payee])), [payees]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const {
    netPosition,
    openItems,
    payableItems,
    receivableItems,
    recurringItems,
    totalPayable,
    totalReceivable
  } = useMemo(() => partitionAgendaItems(items), [items]);
  const calendarDays = useMemo(
    () => buildCalendarDays(anchorDate, calendarMode),
    [anchorDate, calendarMode]
  );
  const calendarIndex = useMemo(
    () => buildCalendarEntryIndex(projection.events, itemById),
    [itemById, projection.events]
  );
  const yearMonths = useMemo(() => buildYearMonths(anchorDate, workspace.locale), [anchorDate, workspace.locale]);
  const calendarTitle = formatCalendarTitle(anchorDate, calendarMode, workspace.locale);
  const chart = useMemo(() => buildProjectionChart(projection.dailyPoints), [projection.dailyPoints]);

  function moveCalendar(direction: -1 | 1) {
    setAnchorDate((currentDate) => shiftCalendarDate(currentDate, calendarMode, direction));
  }

  return (
    <section className="module-page bills-page">
      <div className="bills-hero panel">
        <div>
          <p className="section-label">Contas a pagar e receber</p>
          <h2>Agenda que vira previsão de caixa</h2>
          <p className="supporting-copy">
            Cadastre contas, depósitos e reservas uma vez. O Deniaros usa esses compromissos para montar
            calendário, alertas, baixa de pagamentos e projeção de saldo antes do dinheiro apertar.
          </p>
        </div>
        <div className="bills-hero-actions">
          <button className="primary-button" onClick={() => setModalState({ kind: "bill", mode: "create" })} type="button">
            Nova conta
          </button>
          <button className="ghost-button" onClick={() => setModalState({ kind: "deposit", mode: "create" })} type="button">
            Novo depósito
          </button>
        </div>
      </div>

      <div className="bills-flow-strip">
        <article>
          <span>01</span>
          <strong>Agende</strong>
          <p>Cadastre contas, depósitos e reservas uma vez.</p>
        </article>
        <article>
          <span>02</span>
          <strong>Antecipe</strong>
          <p>Veja calendário, risco e saldo projetado antes do vencimento.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Dê baixa</strong>
          <p>Transforme compromissos pagos em histórico financeiro confiável.</p>
        </article>
      </div>

      <section className="panel life-agenda-panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Agenda de vida</p>
            <h3>Compromissos que explicam o dinheiro</h3>
            <p className="micro-copy">
              Reuniões, tarefas, afazeres e lembretes não precisam virar conta a pagar. Eles podem
              explicar decisões, preparar pagamentos e manter a rotina financeira no tempo certo.
            </p>
          </div>
          <span className="status-chip">Próxima camada</span>
        </div>
        <div className="life-agenda-grid">
          <article>
            <span>Reuniões</span>
            <strong>Eventos com horário</strong>
            <p>Conversas, consultas e encontros que podem gerar decisão financeira depois.</p>
          </article>
          <article>
            <span>Tarefas</span>
            <strong>Afazeres com contexto</strong>
            <p>Coisas a resolver antes de uma compra, baixa, negociação ou revisão de contrato.</p>
          </article>
          <article>
            <span>Lembretes</span>
            <strong>Alertas sem valor</strong>
            <p>Datas importantes que não mexem no saldo, mas evitam atraso e improviso.</p>
          </article>
          <article>
            <span>Ligação financeira</span>
            <strong>Quando fizer sentido</strong>
            <p>Um compromisso pessoal pode se conectar a uma conta, mas não entra na previsão sozinho.</p>
          </article>
        </div>
      </section>

      {loadError ? (
        <section className="source-banner">
          <strong>Base principal indisponível</strong>
          <span>{loadError}</span>
        </section>
      ) : null}
      {auditMigrationMissing ? (
        <section className="source-banner">
          <strong>Auditoria aguardando migration</strong>
          <span>Execute as migrations 0012 e 0013 para exibir a trilha da agenda financeira.</span>
        </section>
      ) : null}
      {auditLoadError ? <p className="form-error">{auditLoadError}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <div className="bills-command-strip">
        <article className="panel summary-card">
          <p className="section-label">A pagar</p>
          <strong>{formatCurrency(totalPayable, workspace.baseCurrency, workspace.locale)}</strong>
          <p>{payableItems.length} compromisso{payableItems.length === 1 ? "" : "s"} em aberto.</p>
        </article>
        <article className="panel summary-card">
          <p className="section-label">A receber</p>
          <strong>{formatCurrency(totalReceivable, workspace.baseCurrency, workspace.locale)}</strong>
          <p>{receivableItems.length} entrada{receivableItems.length === 1 ? "" : "s"} programada{receivableItems.length === 1 ? "" : "s"}.</p>
        </article>
        <article className="panel summary-card">
          <p className="section-label">Saldo projetado</p>
          <strong>{formatCurrency(projection.summary.endingBalance, workspace.baseCurrency, workspace.locale)}</strong>
          <p>Resultado em {projection.summary.horizonDays} dias.</p>
        </article>
        <article className="panel summary-card">
          <p className="section-label">Diferença prevista</p>
          <strong className={netPosition >= 0 ? "text-positive" : "text-negative"}>
            {formatCurrency(netPosition, workspace.baseCurrency, workspace.locale)}
          </strong>
          <p>Entradas menos saídas em aberto.</p>
        </article>
      </div>

      <section className="panel bills-forecast-panel" id="previsao">
        <div className="panel-header">
          <div>
            <p className="section-label">Previsão de saldo</p>
            <h3>Como o caixa caminha com a agenda</h3>
          </div>
          <span className={`status-chip status-${projection.summary.riskLevel}`}>
            {projection.summary.riskLevel === "danger"
              ? "Risco"
              : projection.summary.riskLevel === "attention"
                ? "Atenção"
                : "Estável"}
          </span>
        </div>

        <div className="bills-forecast-grid">
          <div className="forecast-chart-shell">
            <svg aria-label="Gráfico de previsão de saldo" className="forecast-chart-svg" viewBox="0 0 920 280">
              {chart.gridLines.map((line) => (
                <g key={line.y}>
                  <line className="forecast-chart-grid" x1="42" x2="888" y1={line.y} y2={line.y} />
                  <text className="forecast-chart-label" x="0" y={line.y + 4}>
                    {formatAxis(line.value, workspace.baseCurrency, workspace.locale)}
                  </text>
                </g>
              ))}
              <line className="forecast-chart-zero" x1="42" x2="888" y1={chart.zeroY} y2={chart.zeroY} />
              <path className="forecast-chart-area" d={chart.areaPath} />
              <path className="forecast-chart-line" d={chart.linePath} />
              {chart.points.map((point) => (
                <circle className="forecast-chart-point" cx={point.x} cy={point.y} key={`${point.x}-${point.y}`} r="4" />
              ))}
            </svg>
          </div>

          <div className="forecast-side-readout">
            <article>
              <p className="mini-label">Menor saldo</p>
              <strong>{formatCurrency(projection.summary.lowestBalance, workspace.baseCurrency, workspace.locale)}</strong>
              <span>{formatShortDate(projection.summary.lowestDate, workspace.locale)}</span>
            </article>
            <article>
              <p className="mini-label">Entradas previstas</p>
              <strong>{formatCurrency(projection.summary.scheduledIncome, workspace.baseCurrency, workspace.locale)}</strong>
              <span>{projection.summary.eventCount} eventos no horizonte</span>
            </article>
            <article>
              <p className="mini-label">Saídas previstas</p>
              <strong>{formatCurrency(projection.summary.scheduledExpenses, workspace.baseCurrency, workspace.locale)}</strong>
              <span>Contas, reservas e compromissos</span>
            </article>
          </div>
        </div>
      </section>

      <section className="panel bills-calendar-panel" id="calendario">
        <div className="panel-header">
          <div>
            <p className="section-label">Calendário dinâmico</p>
            <h3>{calendarTitle}</h3>
          </div>
          <div className="calendar-controls">
            <button className="icon-button" onClick={() => moveCalendar(-1)} type="button" title="Voltar período">
              ‹
            </button>
            {(["year", "month", "week", "day"] as CalendarMode[]).map((mode) => (
              <button
                aria-pressed={calendarMode === mode}
                className={`calendar-mode-button${calendarMode === mode ? " active" : ""}`}
                key={mode}
                onClick={() => setCalendarMode(mode)}
                type="button"
              >
                {mode === "year" ? "Ano" : mode === "month" ? "Mês" : mode === "week" ? "Semana" : "Dia"}
              </button>
            ))}
            <button className="icon-button" onClick={() => moveCalendar(1)} type="button" title="Avançar período">
              ›
            </button>
          </div>
        </div>

        {calendarMode === "year" ? (
          <div className="bills-year-grid">
            {yearMonths.map((month) => {
              const monthStats = calendarIndex.byMonth.get(month.key) ?? { count: 0, outflow: 0 };

              return (
                <button
                  className="bills-month-card"
                  key={month.key}
                  onClick={() => {
                    setAnchorDate(month.date);
                    setCalendarMode("month");
                  }}
                  type="button"
                >
                  <span>{month.label}</span>
                  <strong>{monthStats.count}</strong>
                  <small>{formatCurrency(monthStats.outflow, workspace.baseCurrency, workspace.locale)} a pagar</small>
                </button>
              );
            })}
          </div>
        ) : calendarMode === "day" ? (
          <DayAgenda
            accountById={accountById}
            entries={entriesForDay(calendarIndex.byDay, anchorDate)}
            locale={workspace.locale}
            onEdit={(item) => setModalState({ item, mode: "edit" })}
          />
        ) : (
          <div className={`bills-calendar-grid bills-calendar-${calendarMode}`}>
            {calendarMode === "month"
              ? weekdayLabels.map((weekday) => (
                  <div className="calendar-weekday" key={weekday}>
                    {weekday}
                  </div>
                ))
              : null}
            {calendarDays.map((day) => (
              <CalendarDay
                accountById={accountById}
                currentMonth={anchorDate.getMonth()}
                day={day}
                entries={entriesForDay(calendarIndex.byDay, day)}
                key={toIsoDate(day)}
                locale={workspace.locale}
                mode={calendarMode}
                onEdit={(item) => setModalState({ item, mode: "edit" })}
              />
            ))}
          </div>
        )}
      </section>

      <div className="bills-lists-grid">
        <AgendaList
          accountById={accountById}
          emptyCopy="Nenhuma conta a pagar em aberto."
          items={payableItems}
          locale={workspace.locale}
          onEdit={(item) => setModalState({ item, mode: "edit" })}
          title="Contas a pagar"
        />
        <AgendaList
          accountById={accountById}
          emptyCopy="Nenhum depósito ou recebimento programado."
          items={receivableItems}
          locale={workspace.locale}
          onEdit={(item) => setModalState({ item, mode: "edit" })}
          title="Contas a receber"
        />
      </div>

      <div className="bills-lists-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Baixas recentes</p>
              <h3>Contas pagas recentemente</h3>
            </div>
          </div>
          <div className="bills-table-list">
            {settledTransactions.length ? (
              settledTransactions.slice(0, 8).map((transaction) => {
                const payee = transaction.payeeId ? payeeById.get(transaction.payeeId) : undefined;

                return (
                  <article className="bills-row" key={transaction.id}>
                    <div>
                      <strong>{transaction.description}</strong>
                      <p>
                        {formatShortDate(transaction.date, workspace.locale)} -{" "}
                        {accountById.get(transaction.accountId)?.name ?? "Conta"}
                        {payee ? ` - ${payee.name}` : ""}
                      </p>
                      {transaction.scheduledOccurrenceDate ? (
                        <p>Ocorrência: {formatShortDate(transaction.scheduledOccurrenceDate, workspace.locale)}</p>
                      ) : null}
                    </div>
                    <strong className={transaction.amount >= 0 ? "text-positive" : "text-negative"}>
                      {formatCurrency(transaction.amount, transaction.currency, workspace.locale)}
                    </strong>
                    <Link
                      className="ghost-button compact-action"
                      href={`/transactions?focus=${transaction.id}#transaction-${transaction.id}`}
                    >
                      Ver lançamento
                    </Link>
                  </article>
                );
              })
            ) : (
              <article className="empty-state">
                <strong>Nenhuma baixa recente.</strong>
                <p>Quando uma conta for registrada como paga, ela aparecerá aqui.</p>
              </article>
            )}
          </div>
        </section>

        <section className="panel" id="configuracao">
          <div className="panel-header">
            <div>
              <p className="section-label">Configuração</p>
              <h3>Contas e depósitos recorrentes</h3>
            </div>
            <button className="ghost-button" onClick={() => setModalState({ kind: "saving", mode: "create" })} type="button">
              Nova reserva
            </button>
          </div>
          <div className="bills-table-list">
            {(recurringItems.length ? recurringItems : openItems).slice(0, 10).map((item) => (
              <article className="bills-row" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p>
                    {scheduleKindLabels[item.kind]} - {recurrenceLabel(item.recurrence)} -{" "}
                    {categoryById.get(item.categoryId ?? "")?.name ?? "Sem categoria"}
                  </p>
                </div>
                <button className="ghost-button compact-action" onClick={() => setModalState({ item, mode: "edit" })} type="button">
                  Configurar
                </button>
              </article>
            ))}
            {!openItems.length ? (
              <article className="empty-state">
                <strong>Nenhum compromisso configurado.</strong>
                <p>Use os botões de nova conta ou novo depósito para começar.</p>
              </article>
            ) : null}
          </div>
        </section>
      </div>

      {auditEvents.length ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Auditoria</p>
              <h3>Linha do tempo da agenda</h3>
            </div>
            <span className="status-chip">{auditEvents.length} evento(s)</span>
          </div>
          <div className="bills-table-list">
            {auditEvents.map((event) => {
              const amount = getAgendaAuditAmount(event.metadata);

              return (
                <article className="bills-row" key={event.id}>
                  <div>
                    <strong>{getAgendaAuditLabel(event.event_type)}</strong>
                    <p>
                      {formatAuditDateTime(event.created_at, workspace.locale)} -{" "}
                      {getAgendaAuditTitle(event.metadata)}
                    </p>
                    {event.note ? <p>{event.note}</p> : null}
                  </div>
                  <div className="record-badge-row">
                    {event.before_status ? (
                      <span className="status-chip">Antes: {event.before_status}</span>
                    ) : null}
                    {event.after_status ? (
                      <span className="status-chip">Depois: {event.after_status}</span>
                    ) : null}
                    {amount !== null ? (
                      <strong className={amount >= 0 ? "text-positive" : "text-negative"}>
                        {formatCurrency(amount, workspace.baseCurrency, workspace.locale)}
                      </strong>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {modalState ? (
        <ScheduleModal
          accounts={accounts}
          categories={categories}
          item={modalState.mode === "edit" ? modalState.item : undefined}
          kind={modalState.mode === "create" ? modalState.kind : undefined}
          onClose={() => setModalState(null)}
          payees={payees}
          workspace={workspace}
        />
      ) : null}
    </section>
  );
}

function getAgendaAuditLabel(eventType: AgendaAuditEvent["event_type"]) {
  const labels: Record<AgendaAuditEvent["event_type"], string> = {
    scheduled_deleted: "Compromisso removido",
    scheduled_settled: "Compromisso baixado",
    scheduled_updated: "Compromisso atualizado"
  };

  return labels[eventType] ?? "Evento da agenda";
}

function getAgendaAuditTitle(metadata: Record<string, unknown>) {
  const before = readAuditObject(metadata.before);
  const after = readAuditObject(metadata.after);
  const transaction = readAuditObject(metadata.transaction);
  return (
    readString(metadata.title) ??
    readString(before?.title) ??
    readString(after?.title) ??
    readString(transaction?.description) ??
    "Compromisso financeiro"
  );
}

function getAgendaAuditAmount(metadata: Record<string, unknown>) {
  const before = readAuditObject(metadata.before);
  const after = readAuditObject(metadata.after);
  const transaction = readAuditObject(metadata.transaction);
  return (
    readNumber(metadata.amount) ??
    readNumber(transaction?.amount) ??
    readNumber(after?.amount) ??
    readNumber(before?.amount)
  );
}

function readAuditObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(value: unknown) {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function formatAuditDateTime(value: string, locale: LocaleCode) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function AgendaList({
  accountById,
  emptyCopy,
  items,
  locale,
  onEdit,
  title
}: {
  accountById: Map<string, Account>;
  emptyCopy: string;
  items: ScheduledItem[];
  locale: LocaleCode;
  onEdit: (item: ScheduledItem) => void;
  title: string;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Acompanhamento</p>
          <h3>{title}</h3>
        </div>
        <span className="status-chip">{items.length} em aberto</span>
      </div>
      <div className="bills-table-list">
        {items.length ? (
          items.slice(0, 10).map((item) => (
            <AgendaRow
              accountName={accountById.get(item.accountId)?.name ?? "Conta"}
              item={item}
              key={item.id}
              locale={locale}
              onEdit={onEdit}
            />
          ))
        ) : (
          <article className="empty-state">
            <strong>{emptyCopy}</strong>
            <p>Os próximos compromissos aparecem aqui com baixa e edição rápida.</p>
          </article>
        )}
      </div>
    </section>
  );
}

function AgendaRow({
  accountName,
  item,
  locale,
  onEdit
}: {
  accountName: string;
  item: ScheduledItem;
  locale: LocaleCode;
  onEdit: (item: ScheduledItem) => void;
}) {
  return (
    <article className="bills-row" id={`scheduled-${item.id}`}>
      <div>
        <strong>{item.title}</strong>
        <p>{formatShortDate(item.dueDate, locale)} - {accountName} - {scheduleStatusLabels[item.status]}</p>
      </div>
      <strong className={item.amount >= 0 ? "text-positive" : "text-negative"}>
        {formatCurrency(item.amount, item.currency, locale)}
      </strong>
      <div className="bills-row-actions">
        <form action={settleScheduledItem}>
          <input name="itemId" type="hidden" value={item.id} />
          <input
            aria-label="Data da baixa"
            className="compact-date-input"
            defaultValue={toIsoDate(new Date())}
            name="settlementDate"
            type="date"
          />
          <button className="ghost-button compact-action" disabled={item.status === "paid" && item.recurrence === "once"} type="submit">
            Baixar
          </button>
        </form>
        <button className="ghost-button compact-action" onClick={() => onEdit(item)} type="button">
          Editar
        </button>
      </div>
    </article>
  );
}

function CalendarDay({
  accountById,
  currentMonth,
  day,
  entries,
  locale,
  mode,
  onEdit
}: {
  accountById: Map<string, Account>;
  currentMonth: number;
  day: Date;
  entries: CalendarEntry[];
  locale: LocaleCode;
  mode: CalendarMode;
  onEdit: (item: ScheduledItem) => void;
}) {
  const isOutsideMonth = mode === "month" && day.getMonth() !== currentMonth;
  const isToday = toIsoDate(day) === toIsoDate(new Date());

  return (
    <article className={`calendar-day${isOutsideMonth ? " muted" : ""}${isToday ? " today" : ""}`}>
      <div className="calendar-day-number">{day.getDate()}</div>
      <div className="calendar-day-items">
        {entries.slice(0, mode === "week" ? 6 : 3).map((entry) => (
          <button
            className={`calendar-event ${entry.item.amount >= 0 ? "positive" : "negative"}`}
            key={entry.id}
            onClick={() => onEdit(entry.item)}
            title={`${entry.item.title} - ${accountById.get(entry.item.accountId)?.name ?? "Conta"}`}
            type="button"
          >
            <span>{entry.item.title}</span>
            <small>{formatCurrency(entry.item.amount, entry.item.currency, locale)}</small>
          </button>
        ))}
        {entries.length > (mode === "week" ? 6 : 3) ? (
          <span className="calendar-more">+{entries.length - (mode === "week" ? 6 : 3)}</span>
        ) : null}
      </div>
    </article>
  );
}

function DayAgenda({
  accountById,
  entries,
  locale,
  onEdit
}: {
  accountById: Map<string, Account>;
  entries: CalendarEntry[];
  locale: LocaleCode;
  onEdit: (item: ScheduledItem) => void;
}) {
  return (
    <div className="day-agenda-list">
      {entries.length ? (
        entries.map((entry) => (
          <AgendaRow
            accountName={accountById.get(entry.item.accountId)?.name ?? "Conta"}
            item={entry.item}
            key={entry.id}
            locale={locale}
            onEdit={onEdit}
          />
        ))
      ) : (
        <article className="empty-state">
          <strong>Nada programado para este dia.</strong>
          <p>Avance no calendário ou crie uma nova conta para este período.</p>
        </article>
      )}
    </div>
  );
}

function ScheduleModal({
  accounts,
  categories,
  item,
  kind = "bill",
  onClose,
  payees,
  workspace
}: {
  accounts: Account[];
  categories: Category[];
  item?: ScheduledItem;
  kind?: ScheduledItem["kind"];
  onClose: () => void;
  payees: Payee[];
  workspace: Workspace;
}) {
  const defaultKind = item?.kind ?? kind;
  const [selectedKind, setSelectedKind] = useState<ScheduledItem["kind"]>(defaultKind);
  const [selectedRecurrence, setSelectedRecurrence] = useState<ScheduledItem["recurrence"]>(
    item?.recurrence ?? "once"
  );
  const [selectedStatus, setSelectedStatus] = useState<ScheduledItem["status"]>(
    item?.status ?? "scheduled"
  );
  const kindCards = [
    {
      id: "bill" as const,
      label: "Pagar",
      title: "Conta a pagar",
      text: "Sai do caixa e entra no alerta de vencimento.",
      tone: "negative"
    },
    {
      id: "deposit" as const,
      label: "Receber",
      title: "Depósito ou receita",
      text: "Entra na previsão e reduz pressão futura.",
      tone: "positive"
    },
    {
      id: "saving" as const,
      label: "Reservar",
      title: "Reserva planejada",
      text: "Separa dinheiro para meta ou proteção.",
      tone: "neutral"
    }
  ];
  const selectedKindCard = kindCards.find((card) => card.id === selectedKind) ?? kindCards[0];
  const actionLabel = item ? "Salvar alterações" : selectedKind === "deposit" ? "Criar recebimento" : "Criar compromisso";

  return (
    <div aria-modal="true" className="wallet-modal-overlay bills-modal-overlay" role="dialog">
      <button aria-label="Fechar formulário" className="wallet-modal-backdrop" onClick={onClose} type="button" />
      <div className="wallet-modal-card bills-modal-card bills-composer-card">
        <div className="wallet-modal-head bills-composer-head">
          <div>
            <p className="section-label">{item ? "Editar compromisso" : "Novo compromisso"}</p>
            <h3>{item ? item.title : "Lançamento agendado"}</h3>
            <p className="micro-copy">Registre o essencial agora. Detalhes ficam disponíveis sem travar o fluxo.</p>
          </div>
          <button aria-label="Fechar" className="wallet-modal-close" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <form action={item ? updateScheduledItem : createScheduledItem} className="bills-composer-form">
          {item ? <input name="itemId" type="hidden" value={item.id} /> : null}
          <input name="defaultCurrency" type="hidden" value={workspace.baseCurrency} />
          <input name="kind" type="hidden" value={selectedKind} />
          <input name="recurrence" type="hidden" value={selectedRecurrence} />
          <input name="status" type="hidden" value={selectedStatus} />

          <div className="composer-kind-grid" role="radiogroup" aria-label="Tipo de compromisso">
            {kindCards.map((card) => (
              <button
                aria-checked={selectedKind === card.id}
                className={`composer-kind-card ${card.tone}${selectedKind === card.id ? " active" : ""}`}
                key={card.id}
                onClick={() => setSelectedKind(card.id)}
                role="radio"
                type="button"
              >
                <span>{card.label}</span>
                <strong>{card.title}</strong>
                <small>{card.text}</small>
              </button>
            ))}
          </div>

          <div className="composer-main-grid">
            <label className="composer-field composer-field-title">
              <span>Título</span>
              <input defaultValue={item?.title ?? ""} name="title" placeholder="Ex.: Internet da casa" required />
            </label>

            <label className="composer-field">
              <span>Valor</span>
              <div className={`composer-money-input ${selectedKind === "deposit" ? "positive" : "negative"}`}>
                <small>{selectedKind === "deposit" ? "+" : "-"}</small>
                <input defaultValue={Math.abs(item?.amount ?? 0)} min="0" name="amount" step="0.01" type="number" />
                <em>{workspace.baseCurrency}</em>
              </div>
            </label>

            <label className="composer-field">
              <span>Vencimento</span>
              <input defaultValue={item?.dueDate ?? toIsoDate(new Date())} name="dueDate" required type="date" />
            </label>

            <label className="composer-field">
              <span>Conta</span>
              <select defaultValue={item?.accountId ?? accounts[0]?.id ?? ""} name="accountId" required>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="composer-recurrence">
            <span>Repetição</span>
            <div>
              {scheduleRecurrenceOptions.map((option) => (
                <button
                  aria-pressed={selectedRecurrence === option.id}
                  className={`composer-chip${selectedRecurrence === option.id ? " active" : ""}`}
                  key={option.id}
                  onClick={() => setSelectedRecurrence(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <aside className={`composer-preview ${selectedKindCard.tone}`}>
            <p className="mini-label">Prévia inteligente</p>
            <strong>{selectedKindCard.title}</strong>
            <span>
              Este item será considerado na agenda, no calendário e na previsão de saldo de 90 dias.
            </span>
          </aside>

          <details className="composer-advanced">
            <summary>Detalhes opcionais</summary>
            <div className="composer-advanced-grid">
              <label className="composer-field">
                <span>Categoria</span>
                <select defaultValue={item?.categoryId ?? ""} name="categoryId">
                  <option value="">Sem categoria vinculada</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="composer-field">
                <span>Favorecido</span>
                <select defaultValue={item?.payeeId ?? ""} name="payeeId">
                  <option value="">Sem favorecido</option>
                  {payees.map((payee) => (
                    <option key={payee.id} value={payee.id}>
                      {payee.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="composer-field">
                <span>Moeda</span>
                <input defaultValue={item?.currency ?? workspace.baseCurrency} maxLength={3} name="currency" />
              </label>

              <div className="composer-status-field">
                <span>Status</span>
                <div>
                  {scheduleStatusOptions.map((option) => (
                    <button
                      aria-pressed={selectedStatus === option.id}
                      className={`composer-chip${selectedStatus === option.id ? " active" : ""}`}
                      key={option.id}
                      onClick={() => setSelectedStatus(option.id)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </details>

          <div className="composer-actions">
            {item ? (
              <button className="ghost-button danger-button" formAction={deleteScheduledItem} type="submit">
                Excluir
              </button>
            ) : null}
            <button className="primary-button" type="submit">
              {actionLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function buildProjectionChart(points: ForecastPoint[]) {
  const width = 920;
  const height = 280;
  const left = 42;
  const right = 32;
  const top = 18;
  const bottom = 26;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const values = points.map((point) => point.balance);
  const maxValue = Math.max(0, ...values);
  const minValue = Math.min(0, ...values);
  const spread = Math.max(1, maxValue - minValue);
  const mapX = (index: number) => left + (index / Math.max(1, points.length - 1)) * innerWidth;
  const mapY = (value: number) => top + innerHeight - ((value - minValue) / spread) * innerHeight;
  const chartPoints = values.map((value, index) => ({ x: mapX(index), y: mapY(value) }));
  const linePath = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const zeroY = mapY(0);
  const areaPath = chartPoints.length
    ? `M ${chartPoints[0].x.toFixed(2)} ${zeroY.toFixed(2)} ${linePath.replace("M ", "L ")} L ${chartPoints[chartPoints.length - 1].x.toFixed(2)} ${zeroY.toFixed(2)} Z`
    : "";
  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const value = maxValue - ((maxValue - minValue) / 4) * index;
    return { value, y: mapY(value) };
  });

  return {
    areaPath,
    gridLines,
    linePath,
    points: chartPoints.filter((_, index) => index % 10 === 0 || index === chartPoints.length - 1),
    zeroY
  };
}

function partitionAgendaItems(items: ScheduledItem[]) {
  const openItems: ScheduledItem[] = [];
  const paidItems: ScheduledItem[] = [];
  const payableItems: ScheduledItem[] = [];
  const receivableItems: ScheduledItem[] = [];
  const recurringItems: ScheduledItem[] = [];
  let totalPayable = 0;
  let totalReceivable = 0;

  for (const item of items) {
    if (item.status === "paid") {
      paidItems.push(item);
      continue;
    }

    openItems.push(item);

    if (item.amount < 0) {
      payableItems.push(item);
      totalPayable += Math.abs(item.amount);
    } else if (item.amount > 0) {
      receivableItems.push(item);
      totalReceivable += item.amount;
    }

    if (item.recurrence !== "once") {
      recurringItems.push(item);
    }
  }

  openItems.sort(sortByDueDate);
  payableItems.sort(sortByDueDate);
  receivableItems.sort(sortByDueDate);
  recurringItems.sort(sortByDueDate);
  paidItems.sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  return {
    netPosition: totalReceivable - totalPayable,
    openItems,
    paidItems,
    payableItems,
    receivableItems,
    recurringItems,
    totalPayable,
    totalReceivable
  };
}

function buildCalendarEntryIndex(
  events: ForecastProjection["events"],
  itemById: Map<string, ScheduledItem>
) {
  const byDay = new Map<string, CalendarEntry[]>();
  const byMonth = new Map<string, { count: number; outflow: number }>();

  for (const event of events) {
    const item = itemById.get(event.scheduledItemId);

    if (!item) {
      continue;
    }

    const entry = {
      date: event.date,
      id: event.id,
      item
    };
    const monthKey = event.date.slice(0, 7);
    const monthStats = byMonth.get(monthKey) ?? { count: 0, outflow: 0 };

    byDay.set(event.date, [...(byDay.get(event.date) ?? []), entry]);
    monthStats.count += 1;

    if (item.amount < 0) {
      monthStats.outflow += Math.abs(item.amount);
    }

    byMonth.set(monthKey, monthStats);
  }

  return { byDay, byMonth };
}

function buildCalendarDays(anchorDate: Date, mode: CalendarMode) {
  if (mode === "week") {
    const weekStart = getWeekStart(anchorDate);
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }

  if (mode === "day") {
    return [anchorDate];
  }

  const firstOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1, 12, 0, 0);
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function buildYearMonths(anchorDate: Date, locale: LocaleCode) {
  return Array.from({ length: 12 }, (_, monthIndex) => {
    const date = new Date(anchorDate.getFullYear(), monthIndex, 1, 12, 0, 0);

    return {
      date,
      key: toIsoDate(date).slice(0, 7),
      label: new Intl.DateTimeFormat(locale, { month: "short" }).format(date)
    };
  });
}

function formatCalendarTitle(date: Date, mode: CalendarMode, locale: LocaleCode) {
  if (mode === "year") {
    return String(date.getFullYear());
  }

  if (mode === "month") {
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
  }

  if (mode === "week") {
    const start = getWeekStart(date);
    const end = addDays(start, 6);
    return `${formatShortDate(toIsoDate(start), locale)} a ${formatShortDate(toIsoDate(end), locale)}`;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

function shiftCalendarDate(date: Date, mode: CalendarMode, direction: -1 | 1) {
  const nextDate = new Date(date);

  if (mode === "year") {
    nextDate.setFullYear(nextDate.getFullYear() + direction);
  } else if (mode === "month") {
    nextDate.setMonth(nextDate.getMonth() + direction);
  } else if (mode === "week") {
    nextDate.setDate(nextDate.getDate() + direction * 7);
  } else {
    nextDate.setDate(nextDate.getDate() + direction);
  }

  nextDate.setHours(12, 0, 0, 0);
  return nextDate;
}

function entriesForDay(entries: Map<string, CalendarEntry[]>, date: Date) {
  const isoDate = toIsoDate(date);
  return entries.get(isoDate) ?? emptyCalendarEntries;
}

function sortByDueDate(a: ScheduledItem, b: ScheduledItem) {
  return a.dueDate.localeCompare(b.dueDate);
}

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  nextDate.setHours(12, 0, 0, 0);
  return nextDate;
}

function getWeekStart(date: Date) {
  const weekStart = normalizeDate(date);
  const dayOfWeek = weekStart.getDay();
  const shift = dayOfWeek === 0 ? 0 : -dayOfWeek;
  weekStart.setDate(weekStart.getDate() + shift);
  return weekStart;
}

function toIsoDate(date: Date) {
  return normalizeDate(date).toISOString().slice(0, 10);
}

function recurrenceLabel(recurrence: ScheduledItem["recurrence"]) {
  if (recurrence === "weekly") {
    return "Semanal";
  }

  if (recurrence === "monthly") {
    return "Mensal";
  }

  return "Uma vez";
}

function formatAxis(value: number, currency: string, locale: LocaleCode) {
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 0,
    notation: "compact",
    style: "currency"
  }).format(value);
}
