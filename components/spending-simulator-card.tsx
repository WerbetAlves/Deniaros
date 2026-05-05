"use client";

import type { AccountBalance, ScheduledItem } from "@/lib/domain";
import { formatCurrency } from "@/lib/finance";
import {
  simulateSpendingDecision,
  type SpendingSimulationResult
} from "@/lib/spending-simulator";
import { useMemo, useState } from "react";

type SpendingSimulatorCardProps = {
  accounts: AccountBalance[];
  baseCurrency: string;
  locale: string;
  scheduledItems: ScheduledItem[];
};

export function SpendingSimulatorCard({
  accounts,
  baseCurrency,
  locale,
  scheduledItems
}: SpendingSimulatorCardProps) {
  const firstAccount = accounts[0];
  const [accountId, setAccountId] = useState(firstAccount?.id ?? "");
  const [amount, setAmount] = useState("80");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const selectedAccount = accounts.find((account) => account.id === accountId) ?? firstAccount;
  const result = useMemo<SpendingSimulationResult | null>(() => {
    if (!selectedAccount) {
      return null;
    }

    return simulateSpendingDecision({
      amount: Number(amount.replace(",", ".")),
      commitments: scheduledItems
        .filter((item) => item.status !== "paid" && item.accountId === selectedAccount.id)
        .map((item) => ({
          amount: item.amount,
          date: item.dueDate,
          title: item.title
        })),
      currentBalance: selectedAccount.currentBalance,
      description,
      spendDate: date
    });
  }, [amount, date, description, scheduledItems, selectedAccount]);

  if (!selectedAccount) {
    return null;
  }

  const tone = result?.decision === "not_recommended" ? "danger" : result?.decision === "risky" ? "attention" : "stable";

  return (
    <section className={`panel spending-simulator-panel spending-simulator-${tone}`} id="posso-gastar">
      <div className="spending-simulator-head">
        <div>
          <p className="section-label">Decisão rápida</p>
          <h3>Posso gastar?</h3>
        </div>
        <span>{formatCurrency(selectedAccount.currentBalance, selectedAccount.currency || baseCurrency, locale)}</span>
      </div>

      <div className="spending-simulator-grid">
        <label>
          <span>Valor</span>
          <input inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} />
        </label>
        <label>
          <span>Data</span>
          <input onChange={(event) => setDate(event.target.value)} type="date" value={date} />
        </label>
        <label>
          <span>Carteira</span>
          <select onChange={(event) => setAccountId(event.target.value)} value={selectedAccount.id}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Descrição</span>
          <input
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex.: mercado, combustível..."
            value={description}
          />
        </label>
      </div>

      {result ? (
        <article className="spending-simulator-result">
          <strong>{result.label}</strong>
          <p>{result.message}</p>
          <small>
            Menor saldo após o gasto:{" "}
            {formatCurrency(result.minimumBalance, selectedAccount.currency || baseCurrency, locale)}
          </small>
        </article>
      ) : null}
    </section>
  );
}
