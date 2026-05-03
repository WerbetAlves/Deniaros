import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ImportReconciliationForm } from "@/components/import-reconciliation-form";
import { getFinancialData } from "@/lib/financial-data";
import { formatCurrency, formatShortDate } from "@/lib/finance";
import {
  importRuleMatchFieldOptions,
  importRuleMatchTypeOptions,
  importRuleStatusOptions,
  ImportRuleRow,
  mapImportRule
} from "@/lib/imports";
import { getWorkspaceContext } from "@/lib/workspace-context";
import {
  cancelLatestImportBatch,
  createImportRule,
  deleteImportRule,
  deleteImportedTransactions,
  importTransactions,
  postImportedTransactions,
  updateImportRule
} from "@/app/imports/actions";

const supportedHeaders = [
  "date / data",
  "description / descrição / histórico",
  "amount / valor",
  "payee / favorecido",
  "category / categoria",
  "subcategory / subcategoria",
  "type / tipo",
  "QIF: D, T, P, M, L"
];

const sampleCsv = `date,description,amount,payee,category,subcategory,type
2026-04-24,Pagamento da energia,-118.40,Conta de energia,Moradia,Utilidades,debit
2026-04-25,Repasse Uber,1220.00,Uber,Renda,Servicos,credit`;

const sampleQif = `!Type:Bank
D4/24'26
T-118.40
PConta de energia
LMoradia:Utilidades
^`;

type ImportBatchRow = {
  account_id: string | null;
  created_at: string;
  duplicate_count: number;
  id: string;
  imported_count: number;
  original_filename: string | null;
  row_count: number;
  rule_match_count: number;
  status: "cancelled" | "completed" | "failed" | "partial";
  summary: string | null;
};

type TransactionAuditEventRow = {
  actor_id: string | null;
  after_status: string | null;
  before_status: string | null;
  created_at: string;
  event_type: "imported_posted" | "imported_deleted" | "imported_rule_applied" | "manual_adjustment";
  id: string;
  metadata: Record<string, unknown>;
  note: string | null;
  transaction_id: string | null;
};

type PreviewTransactionRow = {
  account_id: string;
  amount: number;
  description: string;
  import_signature: string | null;
  occurred_on: string;
};

export default async function ImportsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const { accounts, categories, payees, workspace } = await getFinancialData({
    supabase,
    user,
    workspaceId
  });
  const { error, success } = await searchParams;
  const [
    importedResult,
    importRulesResult,
    importBatchesResult,
    auditEventsResult,
    previewTransactionsResult
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("id,status,amount,description,occurred_on,account_id,category_id,payee_id,import_batch_id,import_rule_id,import_signature")
      .eq("workspace_id", workspaceId)
      .eq("source", "imported")
      .order("occurred_on", { ascending: false })
      .limit(250)
      .returns<
        Array<{
          account_id: string;
          amount: number;
          category_id: string | null;
          description: string;
          id: string;
          import_batch_id: string | null;
          import_rule_id: string | null;
          import_signature: string | null;
          occurred_on: string;
          payee_id: string | null;
          status: "pending" | "posted";
        }>
      >(),
    supabase
      .from("import_rules")
      .select(
        "id,workspace_id,name,is_active,match_field,match_type,pattern,scope_account_id,set_category_id,set_payee_id,set_status,priority"
      )
      .eq("workspace_id", workspaceId)
      .order("priority", { ascending: true })
      .returns<ImportRuleRow[]>(),
    supabase
      .from("import_batches")
      .select("id,account_id,original_filename,row_count,imported_count,duplicate_count,rule_match_count,status,summary,created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<ImportBatchRow[]>(),
    supabase
      .from("transaction_audit_events")
      .select("id,transaction_id,actor_id,event_type,before_status,after_status,note,metadata,created_at")
      .eq("workspace_id", workspaceId)
      .in("event_type", ["imported_posted", "imported_deleted"])
      .order("created_at", { ascending: false })
      .limit(12)
      .returns<TransactionAuditEventRow[]>(),
    supabase
      .from("transactions")
      .select("account_id,amount,description,occurred_on,import_signature")
      .eq("workspace_id", workspaceId)
      .order("occurred_on", { ascending: false })
      .limit(1000)
      .returns<PreviewTransactionRow[]>()
  ]);

  const importedTransactions = importedResult.data ?? [];
  const rulesLoadError =
    importRulesResult.error && importRulesResult.error.code !== "42P01"
      ? importRulesResult.error
      : null;
  const rulesMigrationMissing = importRulesResult.error?.code === "42P01";
  const traceabilityMigrationMissing =
    importBatchesResult.error?.code === "42P01" ||
    importedResult.error?.code === "42703" ||
    previewTransactionsResult.error?.code === "42703";
  const auditMigrationMissing = auditEventsResult.error?.code === "42P01";
  const batchesLoadError =
    importBatchesResult.error && importBatchesResult.error.code !== "42P01"
      ? importBatchesResult.error
      : null;
  const auditLoadError =
    auditEventsResult.error && auditEventsResult.error.code !== "42P01"
      ? auditEventsResult.error
      : null;
  const importRules = (importRulesResult.data ?? []).map(mapImportRule);
  const importBatches = importBatchesResult.data ?? [];
  const auditEvents = auditEventsResult.data ?? [];
  const previewTransactions = (previewTransactionsResult.data ?? []).map((transaction) => ({
    accountId: transaction.account_id,
    amount: Number(transaction.amount),
    date: transaction.occurred_on,
    description: transaction.description,
    importSignature: transaction.import_signature
  }));
  const ruleById = new Map(importRules.map((rule) => [rule.id, rule]));
  const batchById = new Map(importBatches.map((batch) => [batch.id, batch]));
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const payeeById = new Map(payees.map((payee) => [payee.id, payee]));
  const categoryLabels = new Map(
    categories.map((category) => [category.id, buildCategoryLabel(category.id, categoryById)])
  );
  const ruleMatchFieldLabels = new Map(
    importRuleMatchFieldOptions.map((option) => [option.id, option.label])
  );
  const ruleMatchTypeLabels = new Map(
    importRuleMatchTypeOptions.map((option) => [option.id, option.label])
  );
  const ruleStatusLabels = new Map(
    importRuleStatusOptions.map((option) => [option.id, option.label])
  );
  const latestCancelableBatch = importBatches.find((batch) => batch.status !== "cancelled");
  const pendingImported = importedTransactions.filter(
    (transaction) => transaction.status === "pending"
  );
  const importedVolume = importedTransactions.reduce(
    (total, transaction) => total + Math.abs(Number(transaction.amount ?? 0)),
    0
  );

  return (
    <AppShell userEmail={user.email}>
      <section className="module-page">
        <div className="module-hero panel">
          <div>
            <p className="section-label">Money99 clássico</p>
            <h2>Importação</h2>
            <p className="supporting-copy">
              Traga o extrato para dentro do arquivo com uma porta simples:
              CSV genérico, QIF legado, deduplicação básica e opção de deixar os
              movimentos pendentes para revisão.
            </p>
          </div>
          <div className="profile-badges">
            <span className="status-chip">{accounts.length} conta(s) elegíveis</span>
            <Link className="primary-button" href="/transactions?source=imported&status=pending">
              Revisar registro
            </Link>
          </div>
        </div>

        {importedResult.error && !traceabilityMigrationMissing ? (
          <section className="source-banner">
            <strong>Base principal indisponível</strong>
            <span>
              Execute a migration inicial do projeto antes de usar a importação
              de extrato.
            </span>
          </section>
        ) : null}

        {rulesMigrationMissing ? (
          <section className="source-banner">
            <strong>Regras aguardando migration</strong>
            <span>
              Execute `supabase/migrations/0005_import_rules.sql` para ativar
              a automação de regras na importação.
            </span>
          </section>
        ) : null}

        {traceabilityMigrationMissing ? (
          <section className="source-banner">
            <strong>Rastreabilidade aguardando migration</strong>
            <span>
              Execute `supabase/migrations/0011_import_traceability.sql` para ativar lotes,
              assinaturas de origem e regra aplicada por lançamento importado.
            </span>
          </section>
        ) : null}

        {auditMigrationMissing ? (
          <section className="source-banner">
            <strong>Auditoria aguardando migration</strong>
            <span>
              Execute `supabase/migrations/0012_transaction_audit_events.sql` para registrar
              conciliações e remoções de importados.
            </span>
          </section>
        ) : null}

        {rulesLoadError ? (
          <p className="form-error">{rulesLoadError.message}</p>
        ) : null}

        {batchesLoadError ? (
          <p className="form-error">{batchesLoadError.message}</p>
        ) : null}

        {auditLoadError ? (
          <p className="form-error">{auditLoadError.message}</p>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        <div className="summary-strip">
          <article className="panel summary-card">
            <p className="section-label">Importados</p>
            <strong>{importedTransactions.length}</strong>
            <p>Movimentos que entraram por extrato desde o início do arquivo.</p>
          </article>
          <article className="panel summary-card">
            <p className="section-label">Pendentes de revisão</p>
            <strong>{pendingImported.length}</strong>
            <p>Ideal para conferência rápida antes de considerar tudo conciliado.</p>
          </article>
          <article className="panel summary-card">
            <p className="section-label">Volume importado</p>
            <strong>{formatCurrency(importedVolume, workspace.baseCurrency, workspace.locale)}</strong>
            <p>Leitura agregada do que entrou por extrato no workspace.</p>
          </article>
        </div>

        <section className="panel legacy-migration-panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Migração assistida</p>
              <h3>Vindo do Money, Quicken ou planilhas antigas?</h3>
            </div>
            <span className="status-chip">CSV + QIF</span>
          </div>
          <div className="legacy-migration-grid">
            <article>
              <strong>1. Prepare uma cópia</strong>
              <p>
                Exporte do sistema antigo sem alterar o arquivo original. CSV é o caminho mais
                flexível; QIF entra como trilha de legado para contas individuais.
              </p>
            </article>
            <article>
              <strong>2. Importe em revisão</strong>
              <p>
                Deixe como pendente, confira duplicados prováveis, categorias e favorecidos antes
                de marcar como lançado.
              </p>
            </article>
            <article>
              <strong>3. Confira saldos</strong>
              <p>
                Depois da conciliação, compare saldo final por conta. Diferenças costumam vir de
                datas, sinais invertidos, arredondamentos ou registros duplicados.
              </p>
            </article>
          </div>
        </section>

        {importBatches.length ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Rastreabilidade</p>
                <h3>Histórico de lotes importados</h3>
              </div>
              <span className="status-chip">{importBatches.length} lote(s) recentes</span>
            </div>
            <div className="record-list">
              {importBatches.map((batch) => {
                const account = batch.account_id ? accountById.get(batch.account_id) : undefined;

                return (
                  <article className="record-card" key={batch.id}>
                    <div className="record-headline">
                      <div>
                        <strong>{batch.original_filename ?? "CSV colado manualmente"}</strong>
                        <p className="micro-copy">
                          {formatShortDate(batch.created_at, workspace.locale)} |{" "}
                          {account?.name ?? "Conta removida"} | {batch.row_count} linha(s)
                        </p>
                      </div>
                      <div className="record-badge-row">
                        <span className="status-chip">{getImportBatchStatusLabel(batch.status)}</span>
                        <span className="status-chip">{batch.imported_count} importado(s)</span>
                        <span className="status-chip">{batch.duplicate_count} duplicado(s)</span>
                        <span className="status-chip">{batch.rule_match_count} por regra</span>
                      </div>
                    </div>
                    {batch.summary ? <p className="micro-copy">{batch.summary}</p> : null}
                    {latestCancelableBatch?.id === batch.id ? (
                      <form action={cancelLatestImportBatch} className="record-inline-actions">
                        <input name="batchId" type="hidden" value={batch.id} />
                        <button className="ghost-button danger-button" type="submit">
                          Cancelar ultima importacao
                        </button>
                      </form>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {auditEvents.length ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Auditoria</p>
                <h3>Linha do tempo da conciliação</h3>
              </div>
              <span className="status-chip">{auditEvents.length} evento(s)</span>
            </div>
            <div className="record-list">
              {auditEvents.map((event) => {
                const metadata = event.metadata ?? {};
                const description =
                  typeof metadata.description === "string" ? metadata.description : "Movimento importado";
                const amount = typeof metadata.amount === "number" ? metadata.amount : null;
                const batchId = typeof metadata.import_batch_id === "string" ? metadata.import_batch_id : null;
                const batch = batchId ? batchById.get(batchId) : undefined;

                return (
                  <article className="record-card" key={event.id}>
                    <div className="record-headline">
                      <div>
                        <strong>
                          {event.event_type === "imported_posted"
                            ? "Movimento conciliado"
                            : "Movimento removido"}
                        </strong>
                        <p className="micro-copy">
                          {formatShortDate(event.created_at, workspace.locale)} | {description}
                          {batch ? ` | Lote ${batch.original_filename ?? "CSV colado"}` : ""}
                        </p>
                        {event.note ? <p className="micro-copy">{event.note}</p> : null}
                      </div>
                      <div className="record-badge-row">
                        {event.before_status ? (
                          <span className="status-chip">{event.before_status}</span>
                        ) : null}
                        {event.after_status ? (
                          <span className="status-chip">{event.after_status}</span>
                        ) : null}
                        {amount !== null ? (
                          <strong className={amount >= 0 ? "text-positive" : "text-negative"}>
                            {formatCurrency(amount, workspace.baseCurrency, workspace.locale)}
                          </strong>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="module-grid planner-grid">
          <section className="panel profile-card">
            <div className="panel-header">
              <div>
                <p className="section-label">Extrato CSV/QIF</p>
                <h3>Importar para uma conta</h3>
              </div>
              <span className="status-chip">Legado seguro</span>
            </div>

            <ImportReconciliationForm
              accounts={accounts}
              existingTransactions={previewTransactions}
              importAction={importTransactions}
              locale={workspace.locale}
              sampleCsv={sampleCsv}
            />
          </section>

          <aside className="panel module-sidecard">
            <div className="panel-header">
              <div>
                <p className="section-label">Formato esperado</p>
                <h3>O que o Deniaros entende</h3>
              </div>
            </div>
            <div className="filter-badges">
              {supportedHeaders.map((header) => (
                <span className="status-chip" key={header}>
                  {header}
                </span>
              ))}
            </div>
            <p className="supporting-copy import-help-copy">
              Datas podem vir como `yyyy-mm-dd`, `dd/mm/yyyy` ou `dd-mm-yyyy`.
              Valores aceitam sinal, virgula decimal e simbolos monetarios.
              Se vier `type`, o sistema entende `debit/credit` ou `despesa/receita`.
              Em QIF, o Deniaros lê data, valor, favorecido, memorando e categoria.
            </p>
            <div className="sample-csv-block">
              <pre>{`${sampleCsv}\n\n--- QIF legado ---\n${sampleQif}`}</pre>
            </div>
            <ul className="module-list">
              <li>deduplicação básica por conta, data, descrição e valor</li>
              <li>subcategorias por caminho como `Categoria / Subcategoria` ou `Categoria:Subcategoria`</li>
              <li>fonte marcada como `imported` para facilitar revisão</li>
              <li>QIF é tratado como importação de conta individual, com conferência de saldo depois</li>
            </ul>
          </aside>
        </div>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Conciliação inicial</p>
              <h3>Revisar importados pendentes</h3>
            </div>
            <span className="status-chip">{pendingImported.length} pendente(s)</span>
          </div>

          {pendingImported.length ? (
            <form className="record-list" action={postImportedTransactions}>
              {pendingImported.map((transaction) => {
                const account = accountById.get(transaction.account_id);
                const category = transaction.category_id
                  ? categoryById.get(transaction.category_id)
                  : undefined;
                const payee = transaction.payee_id
                  ? payeeById.get(transaction.payee_id)
                  : undefined;
                const batch = transaction.import_batch_id
                  ? batchById.get(transaction.import_batch_id)
                  : undefined;
                const rule = transaction.import_rule_id
                  ? ruleById.get(transaction.import_rule_id)
                  : undefined;

                return (
                  <article className="record-card" key={transaction.id}>
                    <div className="record-headline">
                      <div className="record-title-block">
                        <input
                          className="selection-checkbox"
                          defaultChecked
                          name="transactionIds"
                          type="checkbox"
                          value={transaction.id}
                        />
                        <div>
                          <strong>{transaction.description}</strong>
                          <p className="micro-copy">
                            {account?.name ?? "Conta"} |{" "}
                            {formatShortDate(transaction.occurred_on, workspace.locale)}
                            {category ? ` | ${category.name}` : ""}
                            {payee ? ` | ${payee.name}` : ""}
                          </p>
                          <p className="micro-copy">
                            {batch
                              ? `Lote: ${batch.original_filename ?? "CSV colado"} em ${formatShortDate(
                                  batch.created_at,
                                  workspace.locale
                                )}`
                              : "Lote anterior sem rastreabilidade"}
                            {rule ? ` | Regra: ${rule.name}` : ""}
                            {transaction.import_signature ? " | Assinatura registrada" : ""}
                          </p>
                        </div>
                      </div>
                      <strong className={transaction.amount >= 0 ? "text-positive" : "text-negative"}>
                        {formatCurrency(transaction.amount, workspace.baseCurrency, workspace.locale)}
                      </strong>
                    </div>
                  </article>
                );
              })}

              <div className="form-actions">
                <button className="ghost-button danger-button" formAction={deleteImportedTransactions} type="submit">
                  Remover selecionados
                </button>
                <button className="primary-button" type="submit">
                  Marcar selecionados como lançados
                </button>
              </div>
            </form>
          ) : (
            <article className="empty-state">
              <strong>Tudo conciliado por aqui.</strong>
              <p>Os importados pendentes vão aparecer nesta área para revisão rápida.</p>
            </article>
          )}
        </section>

        {rulesMigrationMissing ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Automação indisponível</p>
                <h3>Regras de importação aguardando migration</h3>
              </div>
            </div>
            <p className="supporting-copy">
              Execute a migration <code>supabase/migrations/0005_import_rules.sql</code> no SQL
              Editor e atualize esta pagina para liberar o cadastro e a edição de regras.
            </p>
          </section>
        ) : (
          <div className="module-grid planner-grid">
            <section className="panel profile-card">
              <div className="panel-header">
                <div>
                  <p className="section-label">Nova regra</p>
                  <h3>Automação da importação</h3>
                </div>
                <span className="status-chip">{importRules.length} regra(s)</span>
              </div>

              <form action={createImportRule} className="entity-form profile-form">
                <label className="wide-field">
                  Nome da regra
                  <input name="name" placeholder="Ex.: Energia sempre em Moradia" required />
                </label>

                <label>
                  Campo para comparar
                  <select defaultValue="description" name="matchField">
                    {importRuleMatchFieldOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Tipo de comparação
                  <select defaultValue="contains" name="matchType">
                    {importRuleMatchTypeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="wide-field">
                  Texto padrao
                  <input name="pattern" placeholder="Ex.: energia" required />
                </label>

                <label>
                  Escopo da conta
                  <select defaultValue="none" name="scopeAccountId">
                    <option value="none">Todas as contas</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Prioridade
                  <input defaultValue={100} max={999} min={0} name="priority" type="number" />
                </label>

                <label>
                  Definir categoria
                  <select defaultValue="none" name="setCategoryId">
                    <option value="none">Não alterar</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {categoryLabels.get(category.id) ?? category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Definir favorecido
                  <select defaultValue="none" name="setPayeeId">
                    <option value="none">Não alterar</option>
                    {payees.map((payee) => (
                      <option key={payee.id} value={payee.id}>
                        {payee.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="wide-field">
                  Status de entrada
                  <select defaultValue="keep" name="setStatus">
                    {importRuleStatusOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="form-actions">
                  <button className="primary-button" type="submit">
                    Salvar regra
                  </button>
                </div>
              </form>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="section-label">Regras ativas</p>
                  <h3>Ordem de aplicação na importação</h3>
                </div>
              </div>

              <div className="record-list">
                {importRules.length ? (
                  importRules.map((rule) => (
                    <article className="record-card" key={rule.id}>
                      <div className="record-headline">
                        <div>
                          <strong>{rule.name}</strong>
                          <p className="micro-copy">
                            #{rule.priority} | {ruleMatchFieldLabels.get(rule.matchField)} |{" "}
                            {ruleMatchTypeLabels.get(rule.matchType)} | "{rule.pattern}"
                          </p>
                        </div>
                        <div className="record-badge-row">
                          <span className="status-chip">{rule.isActive ? "Ativa" : "Pausada"}</span>
                        </div>
                      </div>

                      <form action={updateImportRule} className="entity-form compact-form">
                        <input name="ruleId" type="hidden" value={rule.id} />

                        <label className="wide-field">
                          Nome da regra
                          <input defaultValue={rule.name} name="name" required />
                        </label>

                        <label>
                          Campo para comparar
                          <select defaultValue={rule.matchField} name="matchField">
                            {importRuleMatchFieldOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Tipo de comparação
                          <select defaultValue={rule.matchType} name="matchType">
                            {importRuleMatchTypeOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="wide-field">
                          Texto padrao
                          <input defaultValue={rule.pattern} name="pattern" required />
                        </label>

                        <label>
                          Escopo da conta
                          <select defaultValue={rule.scopeAccountId ?? "none"} name="scopeAccountId">
                            <option value="none">Todas as contas</option>
                            {accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Prioridade
                          <input
                            defaultValue={rule.priority}
                            max={999}
                            min={0}
                            name="priority"
                            type="number"
                          />
                        </label>

                        <label>
                          Definir categoria
                          <select defaultValue={rule.setCategoryId ?? "none"} name="setCategoryId">
                            <option value="none">Não alterar</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {categoryLabels.get(category.id) ?? category.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Definir favorecido
                          <select defaultValue={rule.setPayeeId ?? "none"} name="setPayeeId">
                            <option value="none">Não alterar</option>
                            {payees.map((payee) => (
                              <option key={payee.id} value={payee.id}>
                                {payee.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Status de entrada
                          <select defaultValue={rule.setStatus} name="setStatus">
                            {importRuleStatusOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="checkbox-row">
                          <span>Regra ativa</span>
                          <input defaultChecked={rule.isActive} name="isActive" type="checkbox" />
                        </label>

                        <p className="micro-copy wide-field">
                          Ação aplicada:{" "}
                          {rule.setCategoryId
                            ? `categoria ${categoryLabels.get(rule.setCategoryId) ?? "definida"}`
                            : "categoria mantida"}{" "}
                          |{" "}
                          {rule.setPayeeId
                            ? `favorecido ${payeeById.get(rule.setPayeeId)?.name ?? "definido"}`
                            : "favorecido mantido"}{" "}
                          | {ruleStatusLabels.get(rule.setStatus)}
                        </p>

                        <div className="form-actions">
                          <button className="ghost-button danger-button" formAction={deleteImportRule} type="submit">
                            Excluir regra
                          </button>
                          <button className="primary-button" type="submit">
                            Salvar regra
                          </button>
                        </div>
                      </form>
                    </article>
                  ))
                ) : (
                  <article className="empty-state">
                    <strong>Nenhuma regra criada ainda.</strong>
                    <p>
                      Crie regras para automatizar categoria, favorecido e status
                      dos movimentos importados.
                    </p>
                  </article>
                )}
              </div>
            </section>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function buildCategoryLabel(
  categoryId: string,
  categoryById: Map<string, { name: string; parentId?: string }>
) {
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

function getImportBatchStatusLabel(status: ImportBatchRow["status"]) {
  const labels: Record<ImportBatchRow["status"], string> = {
    cancelled: "Cancelada",
    completed: "Concluida",
    failed: "Falhou",
    partial: "Parcial"
  };

  return labels[status] ?? status;
}
