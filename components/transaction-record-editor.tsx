"use client";

import { useMemo, useState } from "react";
import type { Account, Category, LocaleCode, Payee, Transaction } from "@/lib/domain";
import { formatCurrency, formatShortDate, getTransactionAmountForAccount } from "@/lib/finance";

type TransactionRecordEditorProps = {
  accounts: Account[];
  categories: Category[];
  deleteAction: (formData: FormData) => void | Promise<void>;
  highlighted?: boolean;
  locale: LocaleCode;
  payees: Payee[];
  perspectiveAccountId?: string;
  reconciliationAction?: (formData: FormData) => void | Promise<void>;
  transaction: Transaction;
  updateAction: (formData: FormData) => void | Promise<void>;
};

export function TransactionRecordEditor({
  accounts,
  categories,
  deleteAction,
  highlighted = false,
  locale,
  payees,
  perspectiveAccountId,
  reconciliationAction,
  transaction,
  updateAction
}: TransactionRecordEditorProps) {
  const sourceCode = String(transaction.source ?? "manual");
  const hasExternalAmountLock =
    sourceCode === "imported" || sourceCode === "openfinance";
  const isScheduledSettlement = Boolean(transaction.scheduledItemId);
  const isFinanciallyLocked = hasExternalAmountLock || isScheduledSettlement;
  const isReconciled = Boolean(transaction.reconciledAt);
  const sourceLabelByCode: Record<string, string> = {
    assistant: "Assistente",
    imported: "Importado",
    manual: "Manual",
    openfinance: "Open Finance",
    recurring: "Recorrente"
  };
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );
  const payeeById = useMemo(
    () => new Map(payees.map((payee) => [payee.id, payee])),
    [payees]
  );
  const initialDirection: "expense" | "income" | "transfer" = transaction.transferAccountId
    ? "transfer"
    : transaction.amount >= 0
      ? "income"
      : "expense";
  const linkedCategory = transaction.categoryId
    ? categoryById.get(transaction.categoryId)
    : undefined;
  const initialCategoryId =
    linkedCategory && linkedCategory.parentId ? linkedCategory.parentId : transaction.categoryId ?? "";
  const initialSubcategoryId = linkedCategory?.parentId ? linkedCategory.id : "";
  const [selectedDirection, setSelectedDirection] = useState(initialDirection);
  const [selectedAccountId, setSelectedAccountId] = useState(transaction.accountId);
  const [selectedTransferAccountId, setSelectedTransferAccountId] = useState(
    transaction.transferAccountId ?? ""
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(initialSubcategoryId);
  const parentCategories = categories.filter(
    (category) =>
      !category.parentId &&
      selectedDirection !== "transfer" &&
      category.kind === selectedDirection
  );
  const subcategories = categories.filter(
    (category) => category.parentId === selectedCategoryId
  );
  const transferAccounts = accounts.filter((account) => account.id !== selectedAccountId);
  const sourceAccount = accountById.get(transaction.accountId);
  const targetAccount = transaction.transferAccountId
    ? accountById.get(transaction.transferAccountId)
    : undefined;
  const displayedAmount = transaction.transferAccountId
    ? perspectiveAccountId
      ? getTransactionAmountForAccount(transaction, perspectiveAccountId)
      : Math.abs(transaction.amount)
    : transaction.amount;
  const transactionPayee = transaction.payeeId ? payeeById.get(transaction.payeeId) : undefined;
  const transactionCategory = transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined;
  const parentCategory = transactionCategory?.parentId
    ? categoryById.get(transactionCategory.parentId)
    : undefined;

  function handleDirectionChange(direction: "expense" | "income" | "transfer") {
    setSelectedDirection(direction);
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
    setSelectedTransferAccountId("");
  }

  function handleAccountChange(accountId: string) {
    setSelectedAccountId(accountId);

    if (selectedTransferAccountId === accountId) {
      setSelectedTransferAccountId("");
    }
  }

  function handleCategoryChange(categoryId: string) {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId("");
  }

  return (
    <article
      className={`record-card${highlighted ? " record-card-highlighted" : ""}${
        isScheduledSettlement ? " record-card-traced" : ""
      }`}
      id={`transaction-${transaction.id}`}
    >
      <div className="record-headline">
        <div>
          <strong>{transaction.description}</strong>
          <p className="micro-copy">
            {sourceAccount?.name ?? "Conta"}
            {targetAccount ? ` | Transferência para ${targetAccount.name}` : ""}
            {!targetAccount && transactionPayee ? ` | ${transactionPayee.name}` : ""}
            {!targetAccount && transactionCategory
              ? ` | ${parentCategory ? `${parentCategory.name} / ` : ""}${transactionCategory.name}`
              : ""}
            {` | ${formatShortDate(transaction.date, locale)}`}
            {isScheduledSettlement && transaction.scheduledOccurrenceDate
              ? ` | Ocorrência ${formatShortDate(transaction.scheduledOccurrenceDate, locale)}`
              : ""}
          </p>
        </div>
        <div className="record-badge-row">
          {isScheduledSettlement ? (
            <span className="status-chip status-gold">Baixa da agenda</span>
          ) : null}
          <span className="status-chip">{sourceLabelByCode[sourceCode] ?? "Manual"}</span>
          <span className="status-chip">
            {transaction.status === "pending" ? "Pendente" : "Lançado"}
          </span>
          <span className={`status-chip ${isReconciled ? "status-positive" : "status-gold"}`}>
            {isReconciled ? "Conferido" : "A conferir"}
          </span>
          <span
            className={`status-chip ${
              transaction.transferAccountId
                ? "status-gold"
                : transaction.amount >= 0
                  ? "status-positive"
                  : "status-danger"
            }`}
          >
            {transaction.transferAccountId
              ? "Transferência"
              : transaction.amount >= 0
                ? "Receita"
                : "Despesa"}
          </span>
          <strong
            className={
              transaction.transferAccountId
                ? "text-transfer"
                : displayedAmount >= 0
                  ? "text-positive"
                  : "text-negative"
            }
          >
            {formatCurrency(displayedAmount, transaction.currency, locale)}
          </strong>
        </div>
      </div>

      <form action={updateAction} className="entity-form compact-form">
        <input name="itemId" type="hidden" value={transaction.id} />
        {isScheduledSettlement ? (
          <>
            <input name="direction" type="hidden" value={initialDirection} />
            <input name="accountId" type="hidden" value={transaction.accountId} />
            <input
              name="transferAccountId"
              type="hidden"
              value={transaction.transferAccountId ?? ""}
            />
            <input name="status" type="hidden" value={transaction.status} />
          </>
        ) : null}

        <label>
          Tipo
          <select
            disabled={isScheduledSettlement}
            name="direction"
            onChange={(event) =>
              handleDirectionChange(event.target.value as "expense" | "income" | "transfer")
            }
            value={selectedDirection}
          >
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
            <option value="transfer">Transferência</option>
          </select>
        </label>

        <label>
          Conta
          <select
            disabled={isScheduledSettlement}
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
            disabled={
              isScheduledSettlement || selectedDirection !== "transfer" || !transferAccounts.length
            }
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
          <select disabled={selectedDirection === "transfer"} name="payeeId" defaultValue={transaction.payeeId ?? ""}>
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
          <input defaultValue={transaction.description} name="description" required />
        </label>

        <label>
          Valor
          <input
            defaultValue={Math.abs(transaction.amount)}
            min="0.01"
            name="amount"
            required
            readOnly={isFinanciallyLocked}
            step="0.01"
            type="number"
          />
        </label>

        {isScheduledSettlement ? (
          <p className="micro-copy wide-field trace-copy">
            Baixa rastreada: conta, valor, data e status ficam protegidos para manter o
            vínculo com a agenda. Ajuste apenas descrição, categoria ou favorecido.
          </p>
        ) : hasExternalAmountLock ? (
          <p className="micro-copy wide-field">
            Valor bloqueado: este movimento veio de leitura externa (importação/Open Finance).
            Você pode ajustar as demais informações sem alterar o valor.
          </p>
        ) : null}

        <label>
          Data
          <input
            defaultValue={transaction.date}
            name="occurredOn"
            readOnly={isScheduledSettlement}
            required
            type="date"
          />
        </label>

        <label>
          Status
          <select defaultValue={transaction.status} disabled={isScheduledSettlement} name="status">
            <option value="posted">Lançado</option>
            <option value="pending">Pendente</option>
          </select>
        </label>

        <div className="form-actions">
          <button className="ghost-button danger-button" formAction={deleteAction} type="submit">
            Excluir
          </button>
          <button className="primary-button" type="submit">
            Salvar movimento
          </button>
        </div>
      </form>

      {reconciliationAction ? (
        <form action={reconciliationAction} className="record-reconciliation-form">
          <input name="itemId" type="hidden" value={transaction.id} />
          <input name="reconcile" type="hidden" value={isReconciled ? "false" : "true"} />
          <input name="returnTo" type="hidden" value="/transactions" />
          <p>
            {isReconciled
              ? `Conferido em ${formatShortDate(transaction.reconciledAt ?? transaction.date, locale)}.`
              : "Use a conferência depois de comparar este movimento com o extrato real."}
          </p>
          <button
            className={isReconciled ? "ghost-button" : "primary-button"}
            disabled={transaction.status !== "posted"}
            type="submit"
          >
            {isReconciled ? "Remover conferência" : "Marcar como conferido"}
          </button>
        </form>
      ) : null}
    </article>
  );
}
