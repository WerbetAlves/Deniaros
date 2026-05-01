import Link from "next/link";
import type { AccountBalance, LocaleCode } from "@/lib/domain";
import { formatCurrency } from "@/lib/finance";

const accountTypeLabels: Record<AccountBalance["type"], string> = {
  checking: "Conta corrente",
  cash: "Carteira",
  credit: "Cartão",
  business: "Negócio",
  savings: "Reserva",
  asset: "Ativo",
  liability: "Passivo",
  loan: "Empréstimo",
  investment: "Investimento",
  retirement: "Aposentadoria"
};

export function AccountsOverview({
  accounts,
  locale
}: {
  accounts: AccountBalance[];
  locale: LocaleCode;
}) {
  return (
    <section className="panel accounts-panel">
      <div className="panel-header">
        <div>
          <p className="section-label">Contas</p>
          <h3>Posicao consolidada</h3>
        </div>
        <span className="status-chip">{accounts.length} ativas</span>
      </div>

      <div className="account-list">
        {accounts.map((account) => (
          <Link className="dashboard-item-link" href={`/transactions?accountId=${account.id}`} key={account.id}>
            <article className="account-row">
              <span className={`account-swatch ${account.color}`} />
              <div>
                <strong>{account.name}</strong>
                <p>{accountTypeLabels[account.type]}</p>
              </div>
              <strong>
                {formatCurrency(account.currentBalance, account.currency, locale)}
              </strong>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
