import Link from "next/link";
import type {
  AccountBalance,
  Category,
  LocaleCode,
  Payee,
  Transaction
} from "@/lib/domain";
import { formatCurrency, formatShortDate } from "@/lib/finance";

export function RecentTransactions({
  accounts,
  categories,
  locale,
  payees,
  transactions
}: {
  accounts: AccountBalance[];
  categories: Category[];
  locale: LocaleCode;
  payees: Payee[];
  transactions: Transaction[];
}) {
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const categoryById = new Map(
    categories.map((category) => [category.id, category])
  );
  const payeeById = new Map(payees.map((payee) => [payee.id, payee]));
  const recent = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  return (
    <section className="panel recent-transactions-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Lançamentos recentes</p>
          <h3>Registro e classificação</h3>
        </div>
        <span className="status-chip">MVP core</span>
      </div>

      <div className="transaction-list">
        {recent.map((item) => {
          const account = accountById.get(item.accountId);
          const category = item.categoryId
            ? categoryById.get(item.categoryId)
            : undefined;
          const parentCategory = category?.parentId
            ? categoryById.get(category.parentId)
            : undefined;
          const payee = item.payeeId ? payeeById.get(item.payeeId) : undefined;
          const transferAccount = item.transferAccountId
            ? accountById.get(item.transferAccountId)
            : undefined;
          const categoryLabel = category
            ? `${parentCategory ? `${parentCategory.name} / ` : ""}${category.name}`
            : "Sem categoria";
          const detailParts = [
            account?.name ?? "Conta",
            transferAccount ? `Transferência para ${transferAccount.name}` : categoryLabel,
            payee?.name,
            formatShortDate(item.date, locale)
          ].filter(Boolean);
          const kind = transferAccount ? "transfer" : item.amount >= 0 ? "positive" : "negative";
          const displayedAmount = transferAccount ? Math.abs(item.amount) : item.amount;

          return (
            <Link
              className="dashboard-item-link"
              href={`/transactions?focus=${item.id}#transaction-${item.id}`}
              key={item.id}
            >
              <article className="transaction-item">
                <div className="item-icon">
                  {item.description.slice(0, 2).toUpperCase()}
                </div>
                <div className="item-text">
                  <strong>{item.description}</strong>
                  <p>{detailParts.join(" - ")}</p>
                </div>
                <strong className={`amount ${kind}`}>
                  {formatCurrency(displayedAmount, item.currency, locale)}
                </strong>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
