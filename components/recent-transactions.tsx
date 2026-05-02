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
    .slice(0, 6);

  return (
    <section className="col-span-full rounded-lg border border-[#1D4D3A]/15 bg-[#FAF9F6] p-4 shadow-sm">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Lançamentos recentes
          </p>
          <h3 className="mt-1 font-serif text-2xl font-extrabold leading-none text-slate-900">
            Registro e classificação
          </h3>
        </div>
        <span className="rounded-md border border-[#B88938]/30 bg-[#B88938]/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#7A561A]">
          MVP core
        </span>
      </header>

      <div className="grid gap-2">
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
              className="block rounded-md border border-stone-200 bg-white/70 transition-colors duration-200 hover:bg-stone-100"
              href={`/transactions?focus=${item.id}#transaction-${item.id}`}
              key={item.id}
            >
              <article className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2">
                <div className="grid size-9 place-items-center rounded-md bg-[#1D4D3A] text-xs font-extrabold uppercase text-stone-50">
                  {item.description.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <strong className="block truncate text-sm font-extrabold leading-tight text-slate-900">
                    {item.description}
                  </strong>
                  <p className="mt-0.5 truncate text-xs font-medium text-stone-500">
                    {detailParts.join(" - ")}
                  </p>
                </div>
                <strong className={buildAmountClass(kind)}>
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

function buildAmountClass(kind: "negative" | "positive" | "transfer") {
  const tone = {
    negative: "text-[#9C3F29]",
    positive: "text-[#1D4D3A]",
    transfer: "text-[#B88938]"
  }[kind];

  return `whitespace-nowrap text-right text-base font-extrabold leading-none md:text-lg ${tone}`;
}
