import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TransactionForm } from "@/components/transaction-form";
import { getFinancialData } from "@/lib/financial-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NewTransactionPage({
  searchParams
}: {
  searchParams: Promise<{ accountId?: string; error?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { accounts, categories, payees } = await getFinancialData({ supabase, user });
  const { accountId, error } = await searchParams;
  const defaultAccountId = accounts.some((account) => account.id === accountId)
    ? accountId
    : undefined;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell userEmail={user.email}>
      <section className="form-page transaction-create-page">
        <div className="form-heading">
          <p className="section-label">Lançamentos</p>
          <h2>Novo movimento</h2>
          <p>
            Registre receitas, despesas e transferências no mesmo fluxo. O Deniaros usa esse dado para atualizar
            saldo, relatórios, previsão de caixa e decisões.
          </p>
        </div>

        <div className="transaction-guidance-strip">
          <article>
            <span>1</span>
            <strong>Escolha o tipo</strong>
            <p>Saída, entrada ou transferência interna.</p>
          </article>
          <article>
            <span>2</span>
            <strong>Classifique</strong>
            <p>Conta, categoria e favorecido deixam o relatório útil.</p>
          </article>
          <article>
            <span>3</span>
            <strong>Confirme</strong>
            <p>O painel e a previsão são recalculados automaticamente.</p>
          </article>
        </div>

        <TransactionForm
          accounts={accounts}
          categories={categories}
          defaultAccountId={defaultAccountId}
          error={error}
          payees={payees}
          today={today}
        />
      </section>
    </AppShell>
  );
}
