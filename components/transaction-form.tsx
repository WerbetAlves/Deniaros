"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  const [selectedPayeeId, setSelectedPayeeId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(today);
  const [status, setStatus] = useState<"posted" | "pending">("posted");
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
  const selectedPayee = payees.find((payee) => payee.id === selectedPayeeId);
  const amountPresets = selectedDirection === "income" ? [500, 1200, 3000] : [25, 50, 100, 250];
  const recentPayees = useMemo(() => payees.slice(0, 6), [payees]);
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
  const quickTemplates = [
    {
      categoryHints: ["supermercado", "alimentacao", "alimentação", "mercado"],
      direction: "expense" as const,
      label: "Mercado",
      payeeHints: ["mercado", "supermercado"],
      title: "Mercado da semana"
    },
    {
      categoryHints: ["combustivel", "combustível", "transporte"],
      direction: "expense" as const,
      label: "Transporte",
      payeeHints: ["uber", "99", "posto"],
      title: "Transporte"
    },
    {
      categoryHints: ["aluguel", "moradia", "contas a pagar"],
      direction: "expense" as const,
      label: "Moradia",
      payeeHints: ["aluguel", "condominio", "condomínio"],
      title: "Despesa de moradia"
    },
    {
      categoryHints: ["salario", "salário", "rendimento"],
      direction: "income" as const,
      label: "Salário",
      payeeHints: ["empresa", "salario", "salário"],
      title: "Salário recebido"
    },
    {
      categoryHints: ["outros rendimentos", "rendimento"],
      direction: "income" as const,
      label: "PIX recebido",
      payeeHints: ["pix", "cliente"],
      title: "PIX recebido"
    },
    {
      categoryHints: [],
      direction: "transfer" as const,
      label: "Reserva",
      payeeHints: [],
      title: "Transferência para reserva"
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

  function applyQuickTemplate(template: (typeof quickTemplates)[number]) {
    handleDirectionChange(template.direction);
    setDescription(template.title);

    if (template.direction !== "transfer") {
      selectBestCategory(template.direction, template.categoryHints);
      selectBestPayee(template.payeeHints);
    }
  }

  function selectBestCategory(direction: "expense" | "income", hints: string[]) {
    const match = categories.find((category) => {
      if (category.kind !== direction) {
        return false;
      }

      const normalizedName = normalizeText(category.name);
      return hints.some((hint) => normalizedName.includes(normalizeText(hint)));
    });

    if (!match) {
      setSelectedCategoryId("");
      setSelectedSubcategoryId("");
      return;
    }

    if (match.parentId) {
      setSelectedCategoryId(match.parentId);
      setSelectedSubcategoryId(match.id);
      return;
    }

    setSelectedCategoryId(match.id);
    setSelectedSubcategoryId("");
  }

  function selectBestPayee(hints: string[]) {
    const match = payees.find((payee) => {
      const normalizedName = normalizeText(payee.name);
      return hints.some((hint) => normalizedName.includes(normalizeText(hint)));
    });

    setSelectedPayeeId(match?.id ?? "");
  }

  function setRelativeDate(offsetDays: number) {
    const date = new Date(`${today}T00:00:00`);
    date.setDate(date.getDate() + offsetDays);
    setOccurredOn(date.toISOString().slice(0, 10));
  }

  return (
    <form action={createTransaction} className="entity-form">
      <input name="direction" type="hidden" value={selectedDirection} />
      <input name="status" type="hidden" value={status} />

      <section className="transaction-smart-panel">
        <div>
          <p className="section-label">Lançamento rápido</p>
          <strong>Comece pelo que aconteceu</strong>
          <p>Escolha um atalho e ajuste apenas o que for diferente.</p>
        </div>
        <div className="transaction-template-grid">
          {quickTemplates.map((template) => (
            <button
              className={`transaction-template-chip ${template.direction}`}
              key={template.label}
              onClick={() => applyQuickTemplate(template)}
              type="button"
            >
              {template.label}
            </button>
          ))}
        </div>
      </section>

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
        <select
          disabled={selectedDirection === "transfer"}
          name="payeeId"
          onChange={(event) => setSelectedPayeeId(event.target.value)}
          value={selectedPayeeId}
        >
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
          onChange={(event) => setDescription(event.target.value)}
          placeholder={
            selectedDirection === "transfer"
              ? "Ex.: Transferência para reserva"
              : "Ex.: Mercado da semana"
          }
          required
          value={description}
        />
      </label>

      <label className="transaction-field-with-actions">
        Valor
        <input
          min="0.01"
          name="amount"
          onChange={(event) => setAmount(event.target.value)}
          required
          step="0.01"
          type="number"
          value={amount}
        />
        <span className="transaction-inline-actions">
          {amountPresets.map((preset) => (
            <button key={preset} onClick={() => setAmount(String(preset))} type="button">
              R$ {preset}
            </button>
          ))}
        </span>
      </label>

      <label className="transaction-field-with-actions">
        Data
        <input
          name="occurredOn"
          onChange={(event) => setOccurredOn(event.target.value)}
          required
          type="date"
          value={occurredOn}
        />
        <span className="transaction-inline-actions">
          <button onClick={() => setRelativeDate(-1)} type="button">
            Ontem
          </button>
          <button onClick={() => setRelativeDate(0)} type="button">
            Hoje
          </button>
        </span>
      </label>

      <fieldset className="transaction-status-fieldset">
        <legend>Status</legend>
        <div className="transaction-status-switch">
          <button
            aria-pressed={status === "posted"}
            className={status === "posted" ? "active" : ""}
            onClick={() => setStatus("posted")}
            type="button"
          >
            Lançado
          </button>
          <button
            aria-pressed={status === "pending"}
            className={status === "pending" ? "active" : ""}
            onClick={() => setStatus("pending")}
            type="button"
          >
            Pendente
          </button>
        </div>
      </fieldset>

      {recentPayees.length > 0 && selectedDirection !== "transfer" ? (
        <section className="transaction-payee-shortcuts">
          <p className="section-label">Favorecidos recentes</p>
          <div>
            {recentPayees.map((payee) => (
              <button
                className={selectedPayeeId === payee.id ? "active" : ""}
                key={payee.id}
                onClick={() => {
                  setSelectedPayeeId(payee.id);
                  if (!description) {
                    setDescription(payee.name);
                  }
                }}
                type="button"
              >
                {payee.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

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
            : `${selectedAccount?.name ?? "Escolha a conta"}${selectedCategory ? ` · ${selectedCategory.name}` : ""}${selectedPayee ? ` · ${selectedPayee.name}` : ""}`}
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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
