"use client";

import Link from "next/link";
import { useState } from "react";
import { createTransaction } from "@/app/transactions/actions";
import type { Account, Category, Payee } from "@/lib/domain";

type TransactionFormProps = {
  accounts: Account[];
  categories: Category[];
  defaultAccountId?: string;
  payees: Payee[];
  error?: string;
  today: string;
};

export function TransactionForm({
  accounts,
  categories,
  defaultAccountId,
  payees,
  error,
  today
}: TransactionFormProps) {
  const [selectedDirection, setSelectedDirection] = useState<"expense" | "income" | "transfer">(
    "expense"
  );
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccountId ?? "");
  const [selectedTransferAccountId, setSelectedTransferAccountId] = useState("");
  const parentCategories = categories.filter(
    (category) =>
      !category.parentId &&
      selectedDirection !== "transfer" &&
      category.kind === selectedDirection
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  const subcategories = categories.filter(
    (category) => category.parentId === selectedCategoryId
  );
  const transferAccounts = accounts.filter((account) => account.id !== selectedAccountId);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const selectedTransferAccount = accounts.find((account) => account.id === selectedTransferAccountId);
  const selectedCategory = categories.find(
    (category) => category.id === selectedSubcategoryId || category.id === selectedCategoryId
  );
  const directionOptions = [
    {
      id: "expense" as const,
      title: "Saída",
      description: "Despesa, pagamento ou compra",
      tone: "negative"
    },
    {
      id: "income" as const,
      title: "Entrada",
      description: "Receita, depósito ou recebimento",
      tone: "positive"
    },
    {
      id: "transfer" as const,
      title: "Transferência",
      description: "Movimento entre carteiras",
      tone: "neutral"
    }
  ];

  function handleDirectionChange(direction: "expense" | "income" | "transfer") {
    setSelectedDirection(direction);
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
    setSelectedTransferAccountId("");
  }

  function handleCategoryChange(categoryId: string) {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId("");
  }

  function handleAccountChange(accountId: string) {
    setSelectedAccountId(accountId);

    if (accountId === selectedTransferAccountId) {
      setSelectedTransferAccountId("");
    }
  }

  return (
    <form action={createTransaction} className="entity-form">
      <input name="direction" type="hidden" value={selectedDirection} />

      <fieldset className="transaction-type-fieldset">
        <legend>Tipo de movimento</legend>
        <div className="transaction-type-switch">
          {directionOptions.map((option) => (
            <button
              aria-pressed={selectedDirection === option.id}
              className={`transaction-type-card ${option.tone}${selectedDirection === option.id ? " active" : ""}`}
              key={option.id}
              onClick={() => handleDirectionChange(option.id)}
              type="button"
            >
              <span>{option.title}</span>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <label>
        Conta
        <select
          name="accountId"
          onChange={(event) => handleAccountChange(event.target.value)}
          required
          value={selectedAccountId}
        >
          <option value="">Selecione uma conta</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currency})
            </option>
          ))}
        </select>
      </label>

      <label>
        Conta de destino
        <select
          disabled={selectedDirection !== "transfer" || !transferAccounts.length}
          name="transferAccountId"
          onChange={(event) => setSelectedTransferAccountId(event.target.value)}
          required={selectedDirection === "transfer"}
          value={selectedTransferAccountId}
        >
          <option value="">
            {selectedDirection === "transfer"
              ? transferAccounts.length
                ? "Selecione a conta de destino"
                : "Crie outra conta para transferir"
              : "Não se aplica"}
          </option>
          {transferAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currency})
            </option>
          ))}
        </select>
      </label>

      <label>
        Categoria
        <select
          disabled={selectedDirection === "transfer"}
          name="categoryId"
          onChange={(event) => handleCategoryChange(event.target.value)}
          value={selectedCategoryId}
        >
          <option value="">Sem categoria</option>
          {parentCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Subcategoria
        <select
          disabled={selectedDirection === "transfer" || !subcategories.length}
          name="subcategoryId"
          onChange={(event) => setSelectedSubcategoryId(event.target.value)}
          value={selectedSubcategoryId}
        >
          <option value="">
            {subcategories.length ? "Selecione uma subcategoria" : "Sem subcategoria"}
          </option>
          {subcategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Favorecido
        <select disabled={selectedDirection === "transfer"} name="payeeId">
          <option value="">Sem favorecido</option>
          {payees.map((payee) => (
            <option key={payee.id} value={payee.id}>
              {payee.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Descrição
        <input
          name="description"
          placeholder={
            selectedDirection === "transfer"
              ? "Ex.: Transferência para reserva"
              : "Ex.: Mercado da semana"
          }
          required
        />
      </label>

      <label>
        Valor
        <input min="0.01" name="amount" required step="0.01" type="number" />
      </label>

      <label>
        Data
        <input defaultValue={today} name="occurredOn" required type="date" />
      </label>

      {selectedDirection === "transfer" && !transferAccounts.length ? (
        <p className="form-error">Crie pelo menos duas contas para usar transferências internas.</p>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <aside className={`transaction-preview-card ${selectedDirection}`}>
        <p className="section-label">Prévia do lançamento</p>
        <strong>
          {selectedDirection === "expense"
            ? "Saída da carteira"
            : selectedDirection === "income"
              ? "Entrada na carteira"
              : "Transferência interna"}
        </strong>
        <p>
          {selectedDirection === "transfer"
            ? `${selectedAccount?.name ?? "Conta de origem"} → ${selectedTransferAccount?.name ?? "conta de destino"}`
            : `${selectedAccount?.name ?? "Escolha a conta"}${selectedCategory ? ` · ${selectedCategory.name}` : ""}`}
        </p>
      </aside>

      <div className="form-actions">
        <Link className="ghost-button" href="/">
          Cancelar
        </Link>
        <button className="primary-button" type="submit">
          Salvar lançamento
        </button>
      </div>
    </form>
  );
}
