"use client";

import { useState } from "react";
import {
  createScheduledItem,
  deleteScheduledItem,
  settleScheduledItem,
  updateScheduledItem
} from "@/app/financial-agenda/actions";
import type { Account, Category, LocaleCode, Payee, ScheduledItem, Workspace } from "@/lib/domain";
import {
  scheduleRecurrenceOptions,
  scheduleStatusLabels,
  scheduleStatusOptions
} from "@/lib/finance-admin";
import { formatCurrency, formatShortDate } from "@/lib/finance";

export type CalendarMode = "year" | "month" | "week" | "day";

export type CalendarEntry = {
  date: string;
  id: string;
  item: ScheduledItem;
};

export type ScheduleDraft = {
  amount?: number;
  dueDate?: string;
  recurrence?: ScheduledItem["recurrence"];
  title?: string;
};
export function AgendaList({
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

export function CalendarDay({
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

export function DayAgenda({
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

export function ScheduleModal({
  accounts,
  categories,
  draft,
  item,
  kind = "bill",
  onClose,
  payees,
  workspace
}: {
  accounts: Account[];
  categories: Category[];
  draft?: ScheduleDraft;
  item?: ScheduledItem;
  kind?: ScheduledItem["kind"];
  onClose: () => void;
  payees: Payee[];
  workspace: Workspace;
}) {
  const defaultKind = item?.kind ?? kind;
  const [selectedKind, setSelectedKind] = useState<ScheduledItem["kind"]>(defaultKind);
  const [selectedRecurrence, setSelectedRecurrence] = useState<ScheduledItem["recurrence"]>(
    item?.recurrence ?? draft?.recurrence ?? "once"
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
  const defaultTitle = item?.title ?? draft?.title ?? "";
  const defaultAmount = Math.abs(item?.amount ?? draft?.amount ?? 0);
  const defaultDueDate = item?.dueDate ?? draft?.dueDate ?? toIsoDate(new Date());
  const actionLabel = item ? "Salvar alterações" : selectedKind === "deposit" ? "Criar recebimento" : "Criar compromisso";

  return (
    <div aria-modal="true" className="wallet-modal-overlay bills-modal-overlay" role="dialog">
      <button aria-label="Fechar formulário" className="wallet-modal-backdrop" onClick={onClose} type="button" />
      <div className="wallet-modal-card bills-modal-card bills-composer-card">
        <div className="wallet-modal-head bills-composer-head">
          <div>
            <p className="section-label">{item ? "Editar compromisso" : "Novo compromisso"}</p>
            <h3>{item ? item.title : defaultTitle || "Lançamento agendado"}</h3>
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
              <input defaultValue={defaultTitle} name="title" placeholder="Ex.: Internet da casa" required />
            </label>

            <label className="composer-field">
              <span>Valor</span>
              <div className={`composer-money-input ${selectedKind === "deposit" ? "positive" : "negative"}`}>
                <small>{selectedKind === "deposit" ? "+" : "-"}</small>
                <input defaultValue={defaultAmount} min="0" name="amount" step="0.01" type="number" />
                <em>{workspace.baseCurrency}</em>
              </div>
            </label>

            <label className="composer-field">
              <span>Vencimento</span>
              <input defaultValue={defaultDueDate} name="dueDate" required type="date" />
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

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
