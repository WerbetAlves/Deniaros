import Link from "next/link";
import type { AccountBalance, LocaleCode, Transaction } from "@/lib/domain";
import { formatCurrency, formatShortDate } from "@/lib/finance";

export function RecentActivities({
  accounts,
  locale,
  transactions
}: {
  accounts: AccountBalance[];
  locale: LocaleCode;
  transactions: Transaction[];
}) {
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const recent = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <section className="panel activities-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Atividades recentes</p>
          <h3>Últimos movimentos registrados</h3>
        </div>
        <Link className="ghost-button" href="/transactions">
          Log de atividades
        </Link>
      </div>

      <div className="activity-list">
        {recent.length ? (
          recent.map((item) => (
            <Link
              className="activity-item"
              href={`/transactions?focus=${item.id}#transaction-${item.id}`}
              key={item.id}
            >
              <div>
                <strong>{item.description}</strong>
                <p>
                  {accountById.get(item.accountId)?.name ?? "Conta"} - {formatShortDate(item.date, locale)}
                </p>
              </div>
              <strong className={item.amount >= 0 ? "text-positive" : "text-negative"}>
                {formatCurrency(item.amount, item.currency, locale)}
              </strong>
            </Link>
          ))
        ) : (
          <article className="empty-state">
            <strong>Ainda não ha atividades registradas.</strong>
            <p>Assim que os primeiros movimentos entrarem, este bloco vira seu resumo rápido do dia.</p>
          </article>
        )}
      </div>
    </section>
  );
}
