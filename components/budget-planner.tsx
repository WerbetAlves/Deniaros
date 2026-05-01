"use client";

import { useMemo, useState } from "react";
import {
  createBudget,
  deleteBudget,
  updateBudget
} from "@/app/planner/actions";
import type { Category, CurrencyCode, LocaleCode, ScheduledItem, Transaction } from "@/lib/domain";
import type { CategoryBudget, PersonalProfile } from "@/lib/money99-classic";
import { formatCurrency } from "@/lib/finance";

type BudgetPlannerProps = {
  baseCurrency: CurrencyCode;
  budgets: CategoryBudget[];
  categories: Category[];
  debtMonthlyPayment: number;
  locale: LocaleCode;
  profile: PersonalProfile;
  scheduledItems: ScheduledItem[];
  transactions: Transaction[];
};

type BudgetModalState = { budget?: CategoryBudget; categoryId?: string } | null;

type BudgetSectionKey =
  | "income"
  | "long-term"
  | "occasional"
  | "debt"
  | "expenses"
  | "monthly"
  | "annual"
  | "forecast";

const sectionLabels: Array<{ id: BudgetSectionKey; label: string }> = [
  { id: "income", label: "Rendimento" },
  { id: "long-term", label: "Poupança a longo prazo" },
  { id: "occasional", label: "Fundo de despesas" },
  { id: "debt", label: "Débito" },
  { id: "expenses", label: "Despesas" },
  { id: "monthly", label: "Resumo mensal" },
  { id: "annual", label: "Resumo anual" },
  { id: "forecast", label: "Previsão" }
];

export function BudgetPlanner({
  baseCurrency,
  budgets,
  categories,
  debtMonthlyPayment,
  locale,
  profile,
  scheduledItems,
  transactions
}: BudgetPlannerProps) {
  const [modalState, setModalState] = useState<BudgetModalState>(null);
  const [leftoverChoice, setLeftoverChoice] = useState<"save" | "spend">("save");
  const currentMonthKey = getCurrentMonthKey();
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const expenseCategories = categories.filter((category) => category.kind === "expense");
  const currentBudgets = budgets.filter((budget) => budget.periodMonth === currentMonthKey);
  const plannedMonthlyExpenses = currentBudgets.reduce((total, budget) => total + budget.monthlyLimit, 0);
  const actualMonthlyExpenses = currentBudgets.reduce(
    (total, budget) => total + getSpentForBudgetMonth(budget.categoryId, currentMonthKey, categories, transactions),
    0
  );
  const scheduledMonthlyIncome = scheduledItems
    .filter((item) => item.amount > 0 && item.status !== "paid")
    .reduce((total, item) => total + item.amount, 0);
  const scheduledMonthlyExpenses = scheduledItems
    .filter((item) => item.amount < 0 && item.status !== "paid")
    .reduce((total, item) => total + Math.abs(item.amount), 0);
  const monthlyIncome = profile.monthlyIncome + scheduledMonthlyIncome;
  const monthlySavings = Math.max(0, profile.retirementGoal > 0 ? profile.retirementGoal / 120 : 0);
  const occasionalFund = Math.max(0, profile.emergencyReserveTarget > 0 ? profile.emergencyReserveTarget / 24 : 0);
  const totalMonthlyPlan =
    plannedMonthlyExpenses + scheduledMonthlyExpenses + debtMonthlyPayment + monthlySavings + occasionalFund;
  const monthlyDifference = monthlyIncome - totalMonthlyPlan;
  const annualIncome = monthlyIncome * 12;
  const annualPlan = totalMonthlyPlan * 12;
  const annualDifference = annualIncome - annualPlan;
  const forecast = buildBudgetForecast({
    annualPlan,
    monthlyDifference,
    monthlyIncome,
    totalMonthlyPlan
  });
  const forecastChart = buildBudgetForecastChart(forecast);
  const suggestedCategoryId = expenseCategories.find(
    (category) => !currentBudgets.some((budget) => budget.categoryId === category.id)
  )?.id;

  return (
    <section className="module-page budget-planner-page" id="planejador-orcamento">
      <div className="budget-hero panel">
        <div>
          <p className="section-label">Planejador de orçamento</p>
          <h2>Seu dinheiro ganha função antes de sair.</h2>
          <p className="supporting-copy">
            O orçamento do Deniaros separa renda, poupança, fundo de despesas ocasionais,
            débitos e gastos do mês. A tela ensina onde mexer quando a conta não fecha.
          </p>
        </div>
        <div className="budget-hero-actions">
          <button
            className="primary-button"
            onClick={() => setModalState({ categoryId: suggestedCategoryId })}
            type="button"
          >
            Adicionar categoria
          </button>
          <a className="ghost-button" href="#resumo-mensal">
            Ver resumo
          </a>
        </div>
      </div>

      <nav className="budget-section-nav" aria-label="Seções do planejador de orçamento">
        {sectionLabels.map((section) => (
          <a href={`#budget-${section.id}`} key={section.id}>
            {section.label}
          </a>
        ))}
      </nav>

      <div className="budget-summary-grid">
        <article className="panel summary-card">
          <p className="section-label">Renda mensal</p>
          <strong>{formatCurrency(monthlyIncome, baseCurrency, locale)}</strong>
          <p>Perfil pessoal mais depósitos agendados.</p>
        </article>
        <article className="panel summary-card">
          <p className="section-label">Plano mensal</p>
          <strong>{formatCurrency(totalMonthlyPlan, baseCurrency, locale)}</strong>
          <p>Despesas, débitos, poupança e fundo ocasional.</p>
        </article>
        <article className="panel summary-card">
          <p className="section-label">Resultado mensal</p>
          <strong className={monthlyDifference >= 0 ? "text-positive" : "text-negative"}>
            {formatCurrency(monthlyDifference, baseCurrency, locale)}
          </strong>
          <p>{monthlyDifference >= 0 ? "Orçamento respirando." : "Despesas excedem a renda."}</p>
        </article>
        <article className="panel summary-card">
          <p className="section-label">Resultado anual</p>
          <strong className={annualDifference >= 0 ? "text-positive" : "text-negative"}>
            {formatCurrency(annualDifference, baseCurrency, locale)}
          </strong>
          <p>Projeção se o plano atual se repetir por 12 meses.</p>
        </article>
      </div>

      <div className="budget-planner-grid">
        <section className="panel budget-lesson-panel" id="budget-income">
          <div className="panel-header">
            <div>
              <p className="section-label">Primeiros passos</p>
              <h3>De onde provém seus rendimentos?</h3>
            </div>
            <a className="panel-link" href="/personal-profile">
              Revisar perfil
            </a>
          </div>
          <div className="budget-breakdown-list">
            <BudgetBreakdownRow label="Rendimento declarado" value={profile.monthlyIncome} baseCurrency={baseCurrency} locale={locale} />
            <BudgetBreakdownRow label="Depósitos agendados" value={scheduledMonthlyIncome} baseCurrency={baseCurrency} locale={locale} />
            <BudgetBreakdownRow label="Renda total do plano" value={monthlyIncome} baseCurrency={baseCurrency} locale={locale} strong />
          </div>
          <p className="supporting-copy">
            Comece conferindo renda. Se ela estiver errada, todo limite de despesa fica torto.
          </p>
        </section>

        <section className="panel budget-lesson-panel" id="budget-long-term">
          <div className="panel-header">
            <div>
              <p className="section-label">Poupança a longo prazo</p>
              <h3>O que você separa para o futuro?</h3>
            </div>
          </div>
          <div className="budget-breakdown-list">
            <BudgetBreakdownRow label="Meta de longo prazo" value={profile.retirementGoal} baseCurrency={baseCurrency} locale={locale} />
            <BudgetBreakdownRow label="Contribuição mensal sugerida" value={monthlySavings} baseCurrency={baseCurrency} locale={locale} strong />
          </div>
          <p className="supporting-copy">
            Se a renda estiver pressionada, reduza temporariamente a contribuição. Se sobrar caixa,
            pague você mesmo primeiro.
          </p>
        </section>

        <section className="panel budget-lesson-panel" id="budget-occasional">
          <div className="panel-header">
            <div>
              <p className="section-label">Fundo de despesas ocasionais</p>
              <h3>O que você separa para gastos que aparecem?</h3>
            </div>
          </div>
          <div className="budget-breakdown-list">
            <BudgetBreakdownRow label="Reserva alvo" value={profile.emergencyReserveTarget} baseCurrency={baseCurrency} locale={locale} />
            <BudgetBreakdownRow label="Contribuição mensal sugerida" value={occasionalFund} baseCurrency={baseCurrency} locale={locale} strong />
          </div>
          <p className="supporting-copy">
            Esse fundo evita que férias, manutenção, impostos e emergências virem dívida nova.
          </p>
        </section>

        <section className="panel budget-lesson-panel" id="budget-debt">
          <div className="panel-header">
            <div>
              <p className="section-label">Débito</p>
              <h3>Revise dívidas e empréstimos</h3>
            </div>
            <a className="panel-link" href="#plano-de-pagamento">
              Ver débitos
            </a>
          </div>
          <div className="budget-breakdown-list">
            <BudgetBreakdownRow label="Pagamentos do plano de débitos" value={debtMonthlyPayment} baseCurrency={baseCurrency} locale={locale} />
            <BudgetBreakdownRow label="Contas agendadas a pagar" value={scheduledMonthlyExpenses} baseCurrency={baseCurrency} locale={locale} />
            <BudgetBreakdownRow label="Compromissos mensais" value={debtMonthlyPayment + scheduledMonthlyExpenses} baseCurrency={baseCurrency} locale={locale} strong />
          </div>
          <p className="supporting-copy">
            O orçamento só funciona quando as parcelas já comprometidas entram antes dos desejos.
          </p>
        </section>
      </div>

      <section className="panel budget-expenses-panel" id="budget-expenses">
        <div className="panel-header">
          <div>
            <p className="section-label">Despesas</p>
            <h3>Como você gasta seu dinheiro?</h3>
          </div>
          <div className="budget-actions">
            <button
              className="ghost-button"
              onClick={() => setModalState({ categoryId: suggestedCategoryId })}
              type="button"
            >
              Nova categoria
            </button>
          </div>
        </div>

        <div className="budget-category-list">
          {currentBudgets.length ? (
            currentBudgets.map((budget) => {
              const spent = getSpentForBudgetMonth(budget.categoryId, budget.periodMonth, categories, transactions);
              const usage = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;
              const categoryName = buildCategoryLabel(budget.categoryId, categoryById);

              return (
                <article className="budget-category-card" key={budget.id}>
                  <div>
                    <strong>{categoryName}</strong>
                    <p>
                      {formatCurrency(spent, baseCurrency, locale)} usados de{" "}
                      {formatCurrency(budget.monthlyLimit, baseCurrency, locale)}
                    </p>
                  </div>
                  <div className="budget-progress-stack">
                    <div className="progress-track" role="presentation">
                      <div
                        className={`progress-fill ${usage > 100 ? "progress-fill-danger" : ""}`}
                        style={{ width: `${Math.min(100, Math.max(0, usage))}%` }}
                      />
                    </div>
                    <span className={usage > 100 ? "text-negative" : ""}>{Math.round(usage)}%</span>
                  </div>
                  <button className="ghost-button compact-action" onClick={() => setModalState({ budget })} type="button">
                    Ajustar
                  </button>
                </article>
              );
            })
          ) : (
            <article className="empty-state">
              <strong>Nenhuma categoria orçada para este mês.</strong>
              <p>Comece pelas despesas que mais vazam caixa: mercado, moradia, transporte e cartão.</p>
            </article>
          )}
        </div>
      </section>

      <div className="budget-planner-grid">
        <section className="panel budget-result-panel" id="budget-monthly">
          <div className="panel-header">
            <div>
              <p className="section-label">Resumo mensal</p>
              <h3>Meu orçamento mensal funcionará?</h3>
            </div>
            <span className={`status-chip ${monthlyDifference >= 0 ? "status-stable" : "status-danger"}`}>
              {monthlyDifference >= 0 ? "Fecha" : "Não fecha"}
            </span>
          </div>
          <BudgetBreakdownRow label="Renda total" value={monthlyIncome} baseCurrency={baseCurrency} locale={locale} />
          <BudgetBreakdownRow label="Despesas orçadas" value={plannedMonthlyExpenses} baseCurrency={baseCurrency} locale={locale} />
          <BudgetBreakdownRow label="Despesas reais no mês" value={actualMonthlyExpenses} baseCurrency={baseCurrency} locale={locale} />
          <BudgetBreakdownRow label="Débitos e compromissos" value={debtMonthlyPayment + scheduledMonthlyExpenses} baseCurrency={baseCurrency} locale={locale} />
          <BudgetBreakdownRow label="Poupança e fundo ocasional" value={monthlySavings + occasionalFund} baseCurrency={baseCurrency} locale={locale} />
          <BudgetBreakdownRow label="Resultado mensal" value={monthlyDifference} baseCurrency={baseCurrency} locale={locale} strong />

          <div className="budget-leftover-choice">
            <p className="mini-label">O que fazer com eventual dinheiro restante?</p>
            <button className={leftoverChoice === "save" ? "active" : ""} onClick={() => setLeftoverChoice("save")} type="button">
              Guardar no fundo
            </button>
            <button className={leftoverChoice === "spend" ? "active" : ""} onClick={() => setLeftoverChoice("spend")} type="button">
              Liberar para gastos
            </button>
          </div>
        </section>

        <section className="panel budget-result-panel" id="budget-annual">
          <div className="panel-header">
            <div>
              <p className="section-label">Resumo anual</p>
              <h3>Meu orçamento está correto?</h3>
            </div>
            <span className={`status-chip ${annualDifference >= 0 ? "status-stable" : "status-danger"}`}>
              {annualDifference >= 0 ? "Sustentável" : "Excede renda"}
            </span>
          </div>
          <BudgetBreakdownRow label="Rendimento anual" value={annualIncome} baseCurrency={baseCurrency} locale={locale} />
          <BudgetBreakdownRow label="Plano anual de despesas" value={annualPlan} baseCurrency={baseCurrency} locale={locale} />
          <BudgetBreakdownRow label="Diferença anual" value={annualDifference} baseCurrency={baseCurrency} locale={locale} strong />
          <div className={`budget-warning ${annualDifference >= 0 ? "stable" : "danger"}`}>
            <strong>
              {annualDifference >= 0
                ? "Seu orçamento anual tem folga."
                : "Suas despesas anuais excedem seus rendimentos."}
            </strong>
            <p>
              {annualDifference >= 0
                ? "Use a sobra para reforçar reserva, quitar dívidas ou antecipar metas."
                : "Reduza limites, pause contribuições não essenciais ou revise renda antes de assumir novos gastos."}
            </p>
          </div>
        </section>
      </div>

      <section className="panel budget-forecast-panel" id="budget-forecast">
        <div className="panel-header">
          <div>
            <p className="section-label">Previsão orçamentária</p>
            <h3>Próximos 12 meses</h3>
          </div>
          <span className={`status-chip ${monthlyDifference >= 0 ? "status-stable" : "status-danger"}`}>
            {monthlyDifference >= 0 ? "Saldo positivo" : "Ajuste necessário"}
          </span>
        </div>
        <svg aria-label="Previsão orçamentária para os próximos 12 meses" className="budget-forecast-chart" viewBox="0 0 920 280">
          <line className="forecast-chart-zero" x1="36" x2="890" y1={forecastChart.zeroY} y2={forecastChart.zeroY} />
          {forecastChart.bars.map((bar) => (
            <g key={bar.label}>
              <rect className={bar.value >= 0 ? "budget-bar-positive" : "budget-bar-negative"} x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="3" />
              <text className="budget-bar-label" x={bar.x + bar.width / 2} y="266">
                {bar.label}
              </text>
            </g>
          ))}
        </svg>
      </section>

      {modalState ? (
        <BudgetModal
          budget={modalState.budget}
          categoryId={modalState.categoryId}
          categories={expenseCategories}
          categoryById={categoryById}
          currentMonthKey={currentMonthKey}
          onClose={() => setModalState(null)}
        />
      ) : null}
    </section>
  );
}

function BudgetBreakdownRow({
  baseCurrency,
  label,
  locale,
  strong = false,
  value
}: {
  baseCurrency: CurrencyCode;
  label: string;
  locale: LocaleCode;
  strong?: boolean;
  value: number;
}) {
  return (
    <div className={`budget-breakdown-row${strong ? " strong" : ""}`}>
      <span>{label}</span>
      <strong className={value < 0 ? "text-negative" : ""}>{formatCurrency(value, baseCurrency, locale)}</strong>
    </div>
  );
}

function BudgetModal({
  budget,
  categories,
  categoryById,
  categoryId,
  currentMonthKey,
  onClose
}: {
  budget?: CategoryBudget;
  categories: Category[];
  categoryById: Map<string, Category>;
  categoryId?: string;
  currentMonthKey: string;
  onClose: () => void;
}) {
  return (
    <div aria-modal="true" className="wallet-modal-overlay" role="dialog">
      <button aria-label="Fechar formulário" className="wallet-modal-backdrop" onClick={onClose} type="button" />
      <div className="wallet-modal-card budget-modal-card">
        <div className="wallet-modal-head">
          <div>
            <p className="section-label">{budget ? "Editar orçamento" : "Novo orçamento"}</p>
            <h3>{budget ? buildCategoryLabel(budget.categoryId, categoryById) : "Limite por categoria"}</h3>
          </div>
          <button aria-label="Fechar" className="wallet-modal-close" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <form action={budget ? updateBudget : createBudget} className="entity-form profile-form">
          {budget ? <input name="itemId" type="hidden" value={budget.id} /> : null}

          <label className="wide-field">
            Categoria
            <select defaultValue={budget?.categoryId ?? categoryId ?? categories[0]?.id} name="categoryId" required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {buildCategoryLabel(category.id, categoryById)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Mês do orçamento
            <input defaultValue={budget?.periodMonth ?? currentMonthKey} name="periodMonth" type="month" />
          </label>

          <label>
            Limite mensal
            <input defaultValue={budget?.monthlyLimit ?? 0} min="0" name="monthlyLimit" step="0.01" type="number" />
          </label>

          <label className="wide-field">
            Observações
            <textarea
              defaultValue={budget?.notes ?? ""}
              name="notes"
              placeholder="Ex.: limite para manter mercado e compras da casa sob controle."
              rows={3}
            />
          </label>

          <div className="form-actions">
            {budget ? (
              <button className="ghost-button danger-button" formAction={deleteBudget} type="submit">
                Excluir
              </button>
            ) : null}
            <button className="primary-button" type="submit">
              {budget ? "Salvar orçamento" : "Criar orçamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;
}

function buildCategoryLabel(categoryId: string, categoryById: Map<string, Category>) {
  const category = categoryById.get(categoryId);

  if (!category) {
    return "Categoria";
  }

  if (!category.parentId) {
    return category.name;
  }

  const parent = categoryById.get(category.parentId);
  return parent ? `${parent.name} / ${category.name}` : category.name;
}

function collectCategoryFamilyIds(categoryId: string, categories: Category[]) {
  const familyIds = new Set([categoryId]);
  let changed = true;

  while (changed) {
    changed = false;

    for (const category of categories) {
      if (category.parentId && familyIds.has(category.parentId) && !familyIds.has(category.id)) {
        familyIds.add(category.id);
        changed = true;
      }
    }
  }

  return familyIds;
}

function getSpentForBudgetMonth(
  categoryId: string,
  periodMonth: string,
  categories: Category[],
  transactions: Transaction[]
) {
  const categoryIds = collectCategoryFamilyIds(categoryId, categories);

  return transactions
    .filter(
      (transaction) =>
        !transaction.transferAccountId &&
        transaction.amount < 0 &&
        transaction.date.slice(0, 7) === periodMonth &&
        (transaction.categoryId ? categoryIds.has(transaction.categoryId) : false)
    )
    .reduce((total, transaction) => total + Math.abs(transaction.amount), 0);
}

function buildBudgetForecast({
  annualPlan,
  monthlyDifference
}: {
  annualPlan: number;
  monthlyDifference: number;
  monthlyIncome: number;
  totalMonthlyPlan: number;
}) {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() + index);
    const label = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date);

    return {
      label,
      value: monthlyDifference * (index + 1) - annualPlan * 0.01 * Math.sin(index / 2)
    };
  });
}

function buildBudgetForecastChart(points: Array<{ label: string; value: number }>) {
  const width = 920;
  const height = 280;
  const left = 36;
  const right = 30;
  const top = 18;
  const bottom = 34;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const maxValue = Math.max(1, ...points.map((point) => Math.abs(point.value)));
  const zeroY = top + innerHeight / 2;
  const barGap = 12;
  const barWidth = (innerWidth - barGap * (points.length - 1)) / points.length;

  return {
    bars: points.map((point, index) => {
      const magnitude = Math.min(innerHeight / 2, (Math.abs(point.value) / maxValue) * (innerHeight / 2));
      const isPositive = point.value >= 0;

      return {
        height: Math.max(2, magnitude),
        label: point.label,
        value: point.value,
        width: barWidth,
        x: left + index * (barWidth + barGap),
        y: isPositive ? zeroY - magnitude : zeroY
      };
    }),
    zeroY
  };
}
