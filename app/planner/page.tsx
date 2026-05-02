import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { BudgetPlanner } from "@/components/budget-planner";
import { DataSourceBanner } from "@/components/data-source-banner";
import { DebtReductionPlanner } from "@/components/debt-reduction-planner";
import {
  buildDebtFromAccount,
  buildDebtReductionPlan,
  DebtReductionDebtRow,
  mapDebtReductionDebt
} from "@/lib/debt-reduction";
import { getFinancialData } from "@/lib/financial-data";
import { formatCurrency, getAccountBalances } from "@/lib/finance";
import {
  CategoryBudgetRow,
  getDefaultPersonalProfile,
  mapCategoryBudget,
  mapPersonalProfile,
  PersonalProfileRow
} from "@/lib/money99-classic";
import { getWorkspaceContext } from "@/lib/workspace-context";

type PlannerView = "map" | "debts" | "budget";

export default async function PlannerPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string; view?: string }>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const { accounts, categories, fallbackReason, scheduledItems, source, transactions, workspace } =
    await getFinancialData({ supabase, user, workspaceId });
  const { error, success, view } = await searchParams;
  const activePlanner: PlannerView = view === "debts" || view === "budget" ? view : "map";
  const [profileResult, debtsResult, budgetsResult] = await Promise.all([
    supabase
      .from("personal_profiles")
      .select(
        "workspace_id,planning_horizon,marital_status,housing_status,birth_year,dependents,monthly_income,monthly_fixed_costs,emergency_reserve_target,retirement_goal,risk_tolerance,notes"
      )
      .eq("workspace_id", workspaceId)
      .maybeSingle<PersonalProfileRow>(),
    supabase
      .from("debt_reduction_debts")
      .select(
        "id,workspace_id,linked_account_id,name,balance,annual_interest_rate,minimum_payment,planned_payment,credit_limit,due_day,included_in_plan,notes"
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .returns<DebtReductionDebtRow[]>(),
    supabase
      .from("category_budgets")
      .select("id,workspace_id,category_id,period_month,monthly_limit,notes")
      .eq("workspace_id", workspaceId)
      .order("period_month", { ascending: false })
      .order("created_at", { ascending: true })
      .returns<CategoryBudgetRow[]>()
  ]);
  const profile = profileResult.data
    ? mapPersonalProfile(profileResult.data)
    : getDefaultPersonalProfile(workspaceId);
  const accountBalances = getAccountBalances(accounts, transactions);
  const debtRows = debtsResult.data ?? [];
  const savedDebts = debtRows.map(mapDebtReductionDebt);
  const suggestedDebts =
    savedDebts.length || debtsResult.error
      ? []
      : accountBalances
          .filter((account) => account.type === "credit" || account.currentBalance < 0)
          .map((account) => buildDebtFromAccount(account, workspaceId));
  const debts = savedDebts.length ? savedDebts : suggestedDebts;
  const budgets = (budgetsResult.data ?? []).map(mapCategoryBudget);
  const debtPlan = buildDebtReductionPlan({
    debts,
    extraPayment: 0,
    locale: workspace.locale,
    strategy: "avalanche"
  });
  const accountUseSummary = buildPlannerAccountUseSummary(accountBalances);
  let budgetError = budgetsResult.error
    ? "O planejador de orcamento ainda nao esta disponivel neste ambiente."
    : undefined;

  if (budgetError?.toLowerCase().includes("migration")) {
    budgetError = "O planejador de orcamento ainda nao esta disponivel neste ambiente.";
  }

  return (
    <AppShell user={user} userEmail={user.email} workspaceId={workspace.id}>
      {activePlanner === "map" ? (
        <section className="module-page planner-home">
          <DataSourceBanner fallbackReason={fallbackReason} source={source} />
          <PlannerMap
            accountUseSummary={accountUseSummary}
            budgetCount={budgets.length}
            debtCount={debts.length}
            debtMonthlyPayment={debtPlan.monthlyPayment}
            locale={workspace.locale}
            monthlyIncome={profile.monthlyIncome}
            workspaceCurrency={workspace.baseCurrency}
          />
        </section>
      ) : (
        <section className="planner-selected-shell">
          <DataSourceBanner fallbackReason={fallbackReason} source={source} />
          <div className="planner-context-bar panel">
            <div>
              <p className="section-label">Planejador financeiro</p>
              <strong>
                {activePlanner === "debts"
                  ? "Planejador de redução de débitos"
                  : "Planejador de orçamento"}
              </strong>
            </div>
            <div className="planner-context-actions">
              <Link className="ghost-button" href="/planner">
                Voltar ao mapa
              </Link>
              <Link
                className={activePlanner === "debts" ? "primary-button" : "ghost-button"}
                href="/planner?view=debts"
              >
                Débitos
              </Link>
              <Link
                className={activePlanner === "budget" ? "primary-button" : "ghost-button"}
                href="/planner?view=budget"
              >
                Orçamento
              </Link>
            </div>
          </div>

          {activePlanner === "debts" ? (
            <DebtReductionPlanner
              accounts={accounts}
              baseCurrency={workspace.baseCurrency}
              debtLoadError={
                debtsResult.error
                  ? "O planejador de dividas ainda nao esta disponivel neste ambiente."
                  : undefined
              }
              debts={debts}
              error={error}
              locale={workspace.locale}
              profile={profile}
              success={success}
            />
          ) : null}

          {activePlanner === "budget" ? (
            <>
              {budgetError ? (
                <section className="source-banner">
                  <strong>Planejador de orcamento temporariamente indisponivel</strong>
                  <span>{budgetError}</span>
                </section>
              ) : null}

              <BudgetPlanner
                baseCurrency={workspace.baseCurrency}
                budgets={budgets}
                categories={categories}
                debtMonthlyPayment={debtPlan.monthlyPayment}
                locale={workspace.locale}
                profile={profile}
                scheduledItems={scheduledItems}
                transactions={transactions}
              />
            </>
          ) : null}
        </section>
      )}
    </AppShell>
  );
}

type PlannerAccountUseSummary = {
  debts: number;
  savings: number;
  spending: number;
};

function buildPlannerAccountUseSummary(
  accounts: Array<{ currentBalance: number; type: string }>
): PlannerAccountUseSummary {
  return accounts.reduce(
    (summary, account) => {
      if (
        account.type === "credit" ||
        account.type === "loan" ||
        account.type === "liability" ||
        account.currentBalance < 0
      ) {
        return { ...summary, debts: summary.debts + 1 };
      }

      if (
        account.type === "savings" ||
        account.type === "asset" ||
        account.type === "investment" ||
        account.type === "retirement"
      ) {
        return { ...summary, savings: summary.savings + 1 };
      }

      return { ...summary, spending: summary.spending + 1 };
    },
    { debts: 0, savings: 0, spending: 0 }
  );
}

function PlannerMap({
  accountUseSummary,
  budgetCount,
  debtCount,
  debtMonthlyPayment,
  locale,
  monthlyIncome,
  workspaceCurrency
}: {
  accountUseSummary: PlannerAccountUseSummary;
  budgetCount: number;
  debtCount: number;
  debtMonthlyPayment: number;
  locale: string;
  monthlyIncome: number;
  workspaceCurrency: string;
}) {
  return (
    <>
      <section className="planner-map-hero panel">
        <div>
          <p className="section-label">Planejador financeiro</p>
          <h2>Escolha o plano antes de mexer nos números.</h2>
          <p className="supporting-copy">
            O Deniaros separa o planejamento em dois caminhos. Um ajuda você a sair dos juros.
            O outro organiza o mês antes que o dinheiro seja gasto. Comece pelo assunto que
            está pressionando sua vida financeira hoje.
          </p>
        </div>
        <div className="planner-map-status">
          <span>Renda base</span>
          <strong>{formatCurrency(monthlyIncome, workspaceCurrency, locale)}</strong>
          <small>Use o perfil pessoal para revisar este valor.</small>
        </div>
      </section>

      <section className="panel planner-principle-panel">
        <div className="planner-principle-copy">
          <p className="section-label">Antes do orçamento</p>
          <h3>Pague a você mesmo primeiro.</h3>
          <p>
            O orçamento começa separando o dinheiro que constrói futuro antes de medir o
            dinheiro que pode ser gasto. Depois disso, o Deniaros organiza suas contas por uso
            e transforma o plano em limites mensais, pagamentos e previsão.
          </p>
        </div>

        <div className="planner-principle-steps">
          <article>
            <span>01</span>
            <strong>Reserve primeiro</strong>
            <p>Defina poupança, reserva ou investimento como compromisso, não como sobra.</p>
          </article>
          <article>
            <span>02</span>
            <strong>Agrupe suas contas</strong>
            <p>Separe despesas do dia a dia, poupança, patrimônio, empréstimos e cartões.</p>
          </article>
          <article>
            <span>03</span>
            <strong>Monte o orçamento</strong>
            <p>Entre no planejador com as contas já organizadas e os débitos sob controle.</p>
          </article>
        </div>

        <div className="planner-use-summary">
          <article>
            <span>Despesas</span>
            <strong>{accountUseSummary.spending}</strong>
          </article>
          <article>
            <span>Poupança e patrimônio</span>
            <strong>{accountUseSummary.savings}</strong>
          </article>
          <article>
            <span>Débitos</span>
            <strong>{accountUseSummary.debts}</strong>
          </article>
          <Link className="ghost-button" href="/accounts">
            Revisar grupos
          </Link>
        </div>
      </section>

      <div className="planner-choice-grid">
        <article className="panel planner-choice-card">
          <div className="planner-choice-icon">1</div>
          <div>
            <p className="section-label">Sair dos juros</p>
            <h3>Planejador de redução de débitos</h3>
            <p>
              Inclua cartões, empréstimos e saldos negativos. O sistema calcula a ordem de
              pagamento, compara estratégias e mostra como um extra mensal antecipa a quitação.
            </p>
          </div>
          <ul>
            <li>Escolha entre avalanche de juros e bola de neve.</li>
            <li>Veja juros previstos, pagamento mensal e data estimada de quitação.</li>
            <li>Use quando a prioridade for parar o vazamento de dinheiro.</li>
          </ul>
          <div className="planner-choice-footer">
            <span>{debtCount} dívida{debtCount === 1 ? "" : "s"} no plano</span>
            <Link className="primary-button" href="/planner?view=debts">
              Abrir débitos
            </Link>
          </div>
        </article>

        <article className="panel planner-choice-card">
          <div className="planner-choice-icon">2</div>
          <div>
            <p className="section-label">Controlar o mês</p>
            <h3>Planejador de orçamento</h3>
            <p>
              Defina limites por categoria, acompanhe renda, poupança, fundo de despesas
              ocasionais e o impacto das contas agendadas antes do mês sair do controle.
            </p>
          </div>
          <ul>
            <li>Organize rendimentos, reservas, débitos e despesas.</li>
            <li>Compare plano mensal, resultado anual e previsão futura.</li>
            <li>Use quando a prioridade for saber quanto pode gastar.</li>
          </ul>
          <div className="planner-choice-footer">
            <span>
              {budgetCount} orçamento{budgetCount === 1 ? "" : "s"} salvo
              {budgetCount === 1 ? "" : "s"}
            </span>
            <Link className="primary-button" href="/planner?view=budget">
              Abrir orçamento
            </Link>
          </div>
        </article>
      </div>

      <section className="panel planner-guidance-panel">
        <div>
          <p className="section-label">Como decidir</p>
          <h3>Qual planejador usar primeiro?</h3>
        </div>
        <div className="planner-guidance-grid">
          <article>
            <strong>Se existe dívida cara</strong>
            <p>
              Comece por débitos. O orçamento fica mais realista quando o pagamento mensal
              da dívida já está calculado.
            </p>
          </article>
          <article>
            <strong>Se o mês parece nebuloso</strong>
            <p>
              Comece por orçamento. Ele revela onde a renda está indo e quanto sobra para
              metas, reservas ou pagamentos extras.
            </p>
          </article>
          <article>
            <strong>Se os dois incomodam</strong>
            <p>
              Faça débitos primeiro, depois orçamento. O Deniaros já leva o pagamento mensal
              de débitos para dentro do orçamento.
            </p>
          </article>
        </div>
        <div className="planner-guidance-meter" aria-label="Pagamento mensal de débitos">
          <span>Compromisso atual com débitos</span>
          <strong>{formatCurrency(debtMonthlyPayment, workspaceCurrency, locale)}</strong>
        </div>
      </section>
    </>
  );
}
