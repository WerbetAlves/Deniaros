import Link from "next/link";
import type { LocaleCode, Payee, ScheduledItem } from "@/lib/domain";
import { formatCurrency, formatShortDate } from "@/lib/finance";

const kindLabels: Record<ScheduledItem["kind"], string> = {
  bill: "Conta a pagar",
  deposit: "Depósito",
  saving: "Reserva"
};

export function FinancialAgenda({
  items,
  locale,
  payees
}: {
  items: ScheduledItem[];
  locale: LocaleCode;
  payees: Payee[];
}) {
  const payeeById = new Map(payees.map((payee) => [payee.id, payee]));
  const nextItem = items[0];

  return (
    <section className="panel agenda-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Agenda financeira</p>
          <h3>Contas a pagar e depósitos</h3>
        </div>
        <span className="status-chip">{items.length} em aberto</span>
      </div>

      {nextItem ? (
        <div className="agenda-focus">
          <p className="mini-label">Próximo compromisso</p>
          <strong>{nextItem.title}</strong>
          <span>
            {formatShortDate(nextItem.dueDate, locale)} -{" "}
            {formatCurrency(nextItem.amount, nextItem.currency, locale)}
          </span>
        </div>
      ) : null}

      <div className="agenda-list">
        {items.length ? (
          items.slice(0, 4).map((item) => (
            <Link
              className="dashboard-item-link"
              href={`/financial-agenda#scheduled-${item.id}`}
              key={item.id}
            >
              <article className="agenda-item">
                <div className="item-icon">{kindLabels[item.kind].slice(0, 2).toUpperCase()}</div>
                <div className="agenda-copy">
                  <strong>{item.title}</strong>
                  <p>
                    {kindLabels[item.kind]}
                    {item.payeeId ? ` - ${payeeById.get(item.payeeId)?.name ?? "Favorecido"}` : ""}
                    {" - "}
                    {formatShortDate(item.dueDate, locale)}
                  </p>
                </div>
                <strong className={`amount ${item.amount >= 0 ? "positive" : "negative"}`}>
                  {formatCurrency(item.amount, item.currency, locale)}
                </strong>
              </article>
            </Link>
          ))
        ) : (
          <article className="empty-state">
            <strong>Nenhum compromisso em aberto.</strong>
            <p>A agenda curta volta a aparecer aqui assim que houver novos itens programados.</p>
          </article>
        )}
      </div>

      <Link className="panel-link" href="/financial-agenda">
        Abrir agenda completa
      </Link>
    </section>
  );
}
