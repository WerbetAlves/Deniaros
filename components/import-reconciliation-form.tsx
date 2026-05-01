"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import type { Account, LocaleCode } from "@/lib/domain";
import { formatCurrency, formatShortDate } from "@/lib/finance";
import {
  buildTransactionSignature,
  findImportDuplicate,
  parseImportStatement,
  type ImportDuplicateCandidate
} from "@/lib/imports";

type ImportReconciliationFormProps = {
  accounts: Account[];
  existingTransactions: ImportDuplicateCandidate[];
  importAction: (formData: FormData) => void | Promise<void>;
  locale: LocaleCode;
  sampleCsv: string;
};

type PreviewRow = {
  amount: number;
  date: string;
  description: string;
  duplicateLabel?: string;
  duplicateReason?: "signature" | "same_day_amount_description";
  key: string;
};

export function ImportReconciliationForm({
  accounts,
  existingTransactions,
  importAction,
  locale,
  sampleCsv
}: ImportReconciliationFormProps) {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");
  const [statementText, setStatementText] = useState("");
  const [fileText, setFileText] = useState("");
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const previewSource = statementText.trim() || fileText.trim();
  const previewRows = useMemo(
    () => buildPreviewRows(previewSource, selectedAccountId, existingTransactions),
    [existingTransactions, previewSource, selectedAccountId]
  );
  const duplicateRows = previewRows.filter((row) => row.duplicateReason);
  const cleanRows = previewRows.length - duplicateRows.length;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileText(file ? await file.text() : "");
  }

  return (
    <form action={importAction} className="entity-form profile-form import-reconciliation-form">
      <label>
        Conta de destino
        <select
          name="accountId"
          onChange={(event) => setSelectedAccountId(event.target.value)}
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
        Entrar como
        <select defaultValue="pending" name="status">
          <option value="pending">Pendente para revisão</option>
          <option value="posted">Lançado imediatamente</option>
        </select>
      </label>

      <label className="wide-field">
        Conciliação automática
        <select defaultValue="skip_probable" name="duplicateStrategy">
          <option value="skip_probable">Ignorar prováveis duplicados</option>
          <option value="import_probable">Importar prováveis duplicados mesmo assim</option>
        </select>
      </label>

      <label className="wide-field">
        Arquivo CSV ou QIF
        <input accept=".csv,.qif,text/csv" name="statementFile" onChange={handleFileChange} type="file" />
      </label>

      <label className="checkbox-row wide-field">
        <span>Criar favorecidos automaticamente quando o arquivo trouxer novos nomes</span>
        <input defaultChecked name="autoCreatePayees" type="checkbox" />
      </label>

      <label className="wide-field">
        Ou cole o conteúdo do CSV/QIF
        <textarea
          name="statementText"
          onChange={(event) => setStatementText(event.target.value)}
          placeholder={sampleCsv}
          rows={8}
          value={statementText}
        />
      </label>

      <section className="import-preview-panel wide-field" aria-live="polite">
        <div className="panel-header">
          <div>
            <p className="section-label">Pré-conciliação</p>
            <h3>Leitura antes da importação</h3>
          </div>
          <div className="record-badge-row">
            <span className="status-chip">{previewRows.length} linha(s)</span>
            <span className="status-chip status-positive">{cleanRows} nova(s)</span>
            <span className="status-chip status-gold">{duplicateRows.length} atenção</span>
          </div>
        </div>

        {previewRows.length ? (
          <div className="import-preview-list">
            {previewRows.slice(0, 8).map((row) => (
              <article
                className={`import-preview-row${row.duplicateReason ? " duplicate" : ""}`}
                key={row.key}
              >
                <div>
                  <strong>{row.description}</strong>
                  <p className="micro-copy">
                    {selectedAccount?.name ?? "Conta"} | {formatShortDate(row.date, locale)}
                    {row.duplicateLabel ? ` | ${row.duplicateLabel}` : ""}
                  </p>
                </div>
                <strong className={row.amount >= 0 ? "text-positive" : "text-negative"}>
                  {formatCurrency(row.amount, selectedAccount?.currency ?? "BRL", locale)}
                </strong>
              </article>
            ))}
            {previewRows.length > 8 ? (
              <p className="micro-copy">Mais {previewRows.length - 8} linha(s) ficam para a importação final.</p>
            ) : null}
          </div>
        ) : (
          <article className="empty-state">
            <strong>Cole um CSV/QIF ou selecione um arquivo.</strong>
            <p>A prévia aparece aqui antes de gravar qualquer movimento no arquivo.</p>
          </article>
        )}
      </section>

      <div className="form-actions">
        <a className="ghost-button" href="/transactions">
          Cancelar
        </a>
        <button className="primary-button" type="submit">
          Importar extrato
        </button>
      </div>
    </form>
  );
}

function buildPreviewRows(
  input: string,
  accountId: string,
  existingTransactions: ImportDuplicateCandidate[]
): PreviewRow[] {
  if (!input.trim() || !accountId) {
    return [];
  }

  const fileSignatures = new Set<string>();

  return parseImportStatement(input)
    .filter((row) => row.amount !== 0)
    .map((row, index) => {
      const signature = buildTransactionSignature({
        accountId,
        amount: row.amount,
        date: row.date,
        description: row.description
      });
      const duplicate = findImportDuplicate({
        accountId,
        row,
        signature,
        transactions: existingTransactions
      });
      const isRepeatedInFile = fileSignatures.has(signature);

      fileSignatures.add(signature);

      return {
        amount: row.amount,
        date: row.date,
        description: row.description,
        duplicateLabel: duplicate
          ? duplicate.reason === "signature"
            ? "já importado"
            : `parece ${duplicate.transaction.description}`
          : isRepeatedInFile
            ? "repetido no arquivo"
            : undefined,
        duplicateReason: duplicate?.reason ?? (isRepeatedInFile ? "signature" : undefined),
        key: `${signature}-${index}`
      };
    });
}
