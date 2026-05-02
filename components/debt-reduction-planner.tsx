"use client";

import { useMemo, useState } from "react";
import {
  createDebtReductionDebt,
  deleteDebtReductionDebt,
  updateDebtReductionDebt
} from "@/app/planner/actions";
import type { Account, CurrencyCode, LocaleCode } from "@/lib/domain";
import type { PersonalProfile } from "@/lib/money99-classic";
import {
  buildDebtReductionPlan,
  type DebtReductionDebt,
  type DebtReductionStrategy
} from "@/lib/debt-reduction";
import { formatCurrency } from "@/lib/finance";

type DebtReductionPlannerProps = {
  accounts: Account[];
  baseCurrency: CurrencyCode;
  debts: DebtReductionDebt[];
  debtLoadError?: string;
  error?: string;
  locale: LocaleCode;
  profile: PersonalProfile;
  success?: string;
};

type DebtModalState = { debt?: DebtReductionDebt } | null;

export function DebtReductionPlanner({
  accounts,
  baseCurrency,
  debts,
  debtLoadError,
  error,
  locale,
  profile,
  success
}: DebtReductionPlannerProps) {
  const [strategy, setStrategy] = useState<DebtReductionStrategy>("avalanche");
  const [extraPayment, setExtraPayment] = useState(() => Math.max(0, Math.round((profile.monthlyIncome - profile.monthlyFixedCosts) * 0.2)));
  const [modalState, setModalState] = useState<DebtModalState>(null);
  const visibleDebtLoadError = debtLoadError
    ? "O planejador de dividas ainda nao esta disponivel neste ambiente."
    : undefined;
  const activeDebts = debts.filter((debt) => debt.includedInPlan && debt.balance > 0);
  const plan = useMemo(
    () => buildDebtReductionPlan({ debts, extraPayment, locale, strategy }),
    [debts, extraPayment, locale, strategy]
  );
  const chart = useMemo(() => buildDebtChart(plan.months), [plan.months]);
  const executionMonths = plan.months.slice(0, 6);
  const firstMonth = plan.months[0];
  const progressAfterSixMonths =
    plan.totalDebt > 0 && executionMonths.length
      ? Math.min(100, Math.round(((plan.totalDebt - executionMonths[executionMonths.length - 1].endingBalance) / plan.totalDebt) * 100))
      : 0;
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const margin = profile.monthlyIncome - profile.monthlyFixedCosts;

  return (
    <section className="module-page debt-planner-page" id="planejador-debitos">
      <div className="debt-hero panel">
        <div>
          <p className="section-label">Planejador de redução de débitos</p>
          <h2>Adeus, dívida. Mas com método.</h2>
          <p className="supporting-copy">
            Monte um plano de quitação, escolha a estratégia e veja como pagamentos extras mudam
            o tempo, os juros e a ordem das dívidas. A ideia é ensinar enquanto calcula.
          </p>
        </div>
        <div className="debt-hero-actions">
          <button className="primary-button" onClick={() => setModalState({})} type="button">
            Incluir dívida
          </button>
          <a className="ghost-button" href="#plano-de-pagamento">
            Simular pagamento
          </a>
        </div>
      </div>

      {visibleDebtLoadError ? (
        <section className="source-banner">
          <strong>Planejador temporariamente indisponivel</strong>
          <span>{visibleDebtLoadError}</span>
        </section>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <div className="debt-summary-grid">
        <article className="panel summary-card">
          <p className="section-label">Débito no plano</p>
          <strong>{formatCurrency(plan.totalDebt, baseCurrency, locale)}</strong>
          <p>{activeDebts.length} dívida{activeDebts.length === 1 ? "" : "s"} incluída{activeDebts.length === 1 ? "" : "s"}.</p>
        </article>
        <article className="panel summary-card">
          <p className="section-label">Pagamento mensal</p>
          <strong>{formatCurrency(plan.monthlyPayment, baseCurrency, locale)}</strong>
          <p>Inclui mínimos, parcelas planejadas e extra mensal.</p>
        </article>
        <article className="panel summary-card">
          <p className="section-label">Juros previstos</p>
          <strong>{formatCurrency(plan.totalInterest, baseCurrency, locale)}</strong>
          <p>Estimativa pela taxa anual informada.</p>
        </article>
        <article className="panel summary-card">
          <p className="section-label">Quitação estimada</p>
          <strong>{plan.payoffMonths ? plan.payoffDateLabel : "sem plano"}</strong>
          <p>{plan.payoffMonths ? `${plan.payoffMonths} meses até zerar.` : "Inclua uma dívida para simular."}</p>
        </article>
      </div>

      <div className="debt-planner-grid">
        <section className="panel debt-guide-panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Como funciona</p>
              <h3>Três decisões que reduzem juros</h3>
            </div>
          </div>
          <div className="debt-guide-steps">
            <article>
              <span>1</span>
              <strong>Inclua as dívidas certas</strong>
              <p>Informe saldo devedor, taxa de juros e pagamento mínimo. Cartão e empréstimo entram aqui.</p>
            </article>
            <article>
              <span>2</span>
              <strong>Escolha a estratégia</strong>
              <p>Avalanche prioriza maior juros. Bola de neve prioriza menor saldo para ganhar tração.</p>
            </article>
            <article>
              <span>3</span>
              <strong>Defina o extra possível</strong>
              <p>Mesmo um extra pequeno acelera a quitação quando é direcionado para a dívida certa.</p>
            </article>
          </div>
        </section>

        <section className="panel debt-strategy-panel" id="plano-de-pagamento">
          <div className="panel-header">
            <div>
              <p className="section-label">Plano de pagamentos</p>
              <h3>Teste antes de prometer ao seu caixa</h3>
            </div>
          </div>
          <div className="debt-strategy-switch">
            <button
              aria-pressed={strategy === "avalanche"}
              className={strategy === "avalanche" ? "active" : ""}
              onClick={() => setStrategy("avalanche")}
              type="button"
            >
              Avalanche de juros
              <small>paga primeiro a maior taxa</small>
            </button>
            <button
              aria-pressed={strategy === "snowball"}
              className={strategy === "snowball" ? "active" : ""}
              onClick={() => setStrategy("snowball")}
              type="button"
            >
              Bola de neve
              <small>paga primeiro o menor saldo</small>
            </button>
          </div>

          <label className="debt-extra-control">
            <span>Pagamento extra mensal</span>
            <strong>{formatCurrency(extraPayment, baseCurrency, locale)}</strong>
            <input
              max={Math.max(3000, margin)}
              min="0"
              onChange={(event) => setExtraPayment(Number(event.target.value))}
              step="25"
              type="range"
              value={extraPayment}
            />
            <small>
              Margem declarada no perfil: {formatCurrency(margin, baseCurrency, locale)}.
            </small>
          </label>

          <div className="debt-next-action">
            <p className="mini-label">Próxima ação sugerida</p>
            <strong>
              {plan.recommendedFirstDebt
                ? `Direcione o extra para ${plan.recommendedFirstDebt.name}.`
                : "Inclua uma dívida para gerar o plano."}
            </strong>
            <span>
              {strategy === "avalanche"
                ? "Esta estratégia costuma economizar mais juros."
                : "Esta estratégia costuma gerar vitórias rápidas e motivação."}
            </span>
          </div>
        </section>
      </div>

      <section className="panel debt-execution-panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Plano executavel</p>
            <h3>O que fazer nos proximos meses</h3>
          </div>
          <a className="ghost-button" href="/financial-agenda">
            Criar na agenda
          </a>
        </div>
        <div className="debt-execution-grid">
          <article>
            <span>Agora</span>
            <strong>
              {plan.recommendedFirstDebt
                ? `Priorize ${plan.recommendedFirstDebt.name}`
                : "Inclua uma divida para comecar"}
            </strong>
            <p>
              {firstMonth
                ? `Pagamento sugerido: ${formatCurrency(firstMonth.payment, baseCurrency, locale)}.`
                : "O Deniaros monta a primeira acao quando houver saldo, juros e minimo."}
            </p>
          </article>
          <article>
            <span>6 meses</span>
            <strong>{progressAfterSixMonths}% do saldo atacado</strong>
            <p>
              Progresso estimado se os pagamentos forem mantidos sem novas dividas no periodo.
            </p>
          </article>
          <article>
            <span>Meta</span>
            <strong>{plan.payoffMonths ? plan.payoffDateLabel : "sem data"}</strong>
            <p>
              Revise o saldo todo mes e ajuste o extra antes de confirmar novos compromissos.
            </p>
          </article>
        </div>
        <div className="debt-execution-list" aria-label="Proximos pagamentos do plano">
          {executionMonths.length ? (
            executionMonths.map((month) => (
              <article key={month.monthIndex}>
                <div>
                  <strong>{month.label}</strong>
                  <span>{month.targetDebtName ? `Foco em ${month.targetDebtName}` : "Pagamento base"}</span>
                </div>
                <div>
                  <strong>{formatCurrency(month.payment, baseCurrency, locale)}</strong>
                  <span>
                    Saldo previsto {formatCurrency(month.endingBalance, baseCurrency, locale)}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <article>
              <div>
                <strong>Sem pagamentos calculados</strong>
                <span>Cadastre ao menos uma divida ativa para gerar a sequencia.</span>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="panel debt-chart-panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Visualize seu plano</p>
            <h3>Saldo devedor ao longo do tempo</h3>
          </div>
          <span className="status-chip">{plan.payoffMonths || 0} meses</span>
        </div>
        <svg aria-label="Gráfico de redução do saldo devedor" className="debt-chart" viewBox="0 0 920 280">
          {chart.gridLines.map((line) => (
            <g key={line.y}>
              <line className="forecast-chart-grid" x1="42" x2="888" y1={line.y} y2={line.y} />
              <text className="forecast-chart-label" x="0" y={line.y + 4}>
                {formatAxis(line.value, baseCurrency, locale)}
              </text>
            </g>
          ))}
          <path className="debt-chart-area" d={chart.areaPath} />
          <path className="debt-chart-line" d={chart.linePath} />
        </svg>
      </section>

      <div className="debt-planner-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Inclua contas de débito</p>
              <h3>Dívidas dentro do plano</h3>
            </div>
            <button className="ghost-button" onClick={() => setModalState({})} type="button">
              Nova dívida
            </button>
          </div>
          <div className="debt-list">
            {debts.length ? (
              debts.map((debt) => (
                <article className="debt-card" key={debt.id}>
                  <div>
                    <strong>{debt.name}</strong>
                    <p>
                      {debt.linkedAccountId ? `${accountById.get(debt.linkedAccountId)?.name ?? "Conta"} - ` : ""}
                      {debt.annualInterestRate}% ao ano
                    </p>
                  </div>
                  <div>
                    <strong>{formatCurrency(debt.balance, baseCurrency, locale)}</strong>
                    <p>mínimo {formatCurrency(debt.minimumPayment, baseCurrency, locale)}</p>
                  </div>
                  <button className="ghost-button compact-action" onClick={() => setModalState({ debt })} type="button">
                    Ajustar
                  </button>
                </article>
              ))
            ) : (
              <article className="empty-state">
                <strong>Nenhuma dívida cadastrada ainda.</strong>
                <p>Comece por cartão de crédito, empréstimo pessoal ou parcelamento com juros.</p>
              </article>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Tome uma ação</p>
              <h3>O que fazer depois de simular</h3>
            </div>
          </div>
          <div className="debt-action-steps">
            <article>
              <strong>Agende seus pagamentos</strong>
              <p>Crie contas na agenda financeira para os pagamentos mínimos e extras do plano.</p>
            </article>
            <article>
              <strong>Controle novas despesas</strong>
              <p>Evite novas compras parceladas enquanto o plano estiver em execução.</p>
            </article>
            <article>
              <strong>Recalcule todo mês</strong>
              <p>Atualize o saldo devedor após pagamentos e juros para manter o plano realista.</p>
            </article>
          </div>
        </section>
      </div>

      {modalState ? (
        <DebtModal
          accounts={accounts}
          baseCurrency={baseCurrency}
          debt={modalState.debt}
          onClose={() => setModalState(null)}
        />
      ) : null}
    </section>
  );
}

function DebtModal({
  accounts,
  baseCurrency,
  debt,
  onClose
}: {
  accounts: Account[];
  baseCurrency: CurrencyCode;
  debt?: DebtReductionDebt;
  onClose: () => void;
}) {
  return (
    <div aria-modal="true" className="wallet-modal-overlay" role="dialog">
      <button aria-label="Fechar formulário" className="wallet-modal-backdrop" onClick={onClose} type="button" />
      <div className="wallet-modal-card debt-modal-card">
        <div className="wallet-modal-head">
          <div>
            <p className="section-label">{debt ? "Editar dívida" : "Nova dívida"}</p>
            <h3>{debt?.name ?? "Adicionar ao plano"}</h3>
          </div>
          <button aria-label="Fechar" className="wallet-modal-close" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <form action={debt ? updateDebtReductionDebt : createDebtReductionDebt} className="entity-form profile-form">
          {debt ? <input name="itemId" type="hidden" value={debt.id} /> : null}

          <label className="wide-field">
            Nome da dívida
            <input defaultValue={debt?.name ?? ""} name="name" placeholder="Ex.: Cartão principal" required />
          </label>

          <label>
            Conta vinculada
            <select defaultValue={debt?.linkedAccountId ?? "none"} name="linkedAccountId">
              <option value="none">Sem conta vinculada</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Saldo devedor
            <input defaultValue={debt?.balance ?? 0} min="0" name="balance" step="0.01" type="number" />
          </label>

          <label>
            Taxa anual (%)
            <input defaultValue={debt?.annualInterestRate ?? 0} min="0" name="annualInterestRate" step="0.01" type="number" />
          </label>

          <label>
            Pagamento mínimo
            <input defaultValue={debt?.minimumPayment ?? 0} min="0" name="minimumPayment" step="0.01" type="number" />
          </label>

          <label>
            Pagamento planejado
            <input defaultValue={debt?.plannedPayment ?? debt?.minimumPayment ?? 0} min="0" name="plannedPayment" step="0.01" type="number" />
          </label>

          <label>
            Limite de crédito
            <input defaultValue={debt?.creditLimit ?? 0} min="0" name="creditLimit" step="0.01" type="number" />
          </label>

          <label>
            Dia de vencimento
            <input defaultValue={debt?.dueDay ?? ""} max="31" min="1" name="dueDay" type="number" />
          </label>

          <label className="wide-field checkbox-line">
            <input defaultChecked={debt?.includedInPlan ?? true} name="includedInPlan" type="checkbox" />
            Incluir esta dívida no plano de quitação
          </label>

          <label className="wide-field">
            Observações
            <textarea defaultValue={debt?.notes ?? ""} name="notes" rows={3} />
          </label>

          <div className="form-actions">
            {debt ? (
              <button className="ghost-button danger-button" formAction={deleteDebtReductionDebt} type="submit">
                Excluir
              </button>
            ) : null}
            <button className="primary-button" type="submit">
              {debt ? "Salvar dívida" : `Adicionar em ${baseCurrency}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function buildDebtChart(months: ReturnType<typeof buildDebtReductionPlan>["months"]) {
  const width = 920;
  const height = 280;
  const left = 42;
  const right = 32;
  const top = 18;
  const bottom = 26;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const values = months.length ? months.map((month) => month.endingBalance) : [0];
  const maxValue = Math.max(1, ...values.map((value) => Math.max(0, value)));
  const mapX = (index: number) => left + (index / Math.max(1, values.length - 1)) * innerWidth;
  const mapY = (value: number) => top + innerHeight - (value / maxValue) * innerHeight;
  const points = values.map((value, index) => ({ x: mapX(index), y: mapY(value) }));
  const baselineY = mapY(0);
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath =
    points.length > 1
      ? `M ${points[0].x.toFixed(2)} ${baselineY.toFixed(2)} ${linePath.replace("M ", "L ")} L ${points[points.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} Z`
      : "";
  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const value = maxValue - (maxValue / 4) * index;
    return { value, y: mapY(value) };
  });

  return { areaPath, gridLines, linePath };
}

function formatAxis(value: number, currency: CurrencyCode, locale: LocaleCode) {
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 0,
    notation: "compact",
    style: "currency"
  }).format(value);
}
