import { AppShell } from "@/components/app-shell";
import {
  mapWorkspacePayee,
  payeeTypeLabels,
  payeeTypeOptions,
  WorkspacePayeeRow
} from "@/lib/finance-admin";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { createPayee, deletePayee, updatePayee } from "@/app/payees/actions";

export default async function PayeesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const { error, success } = await searchParams;
  const { data, error: loadError } = await supabase
    .from("payees")
    .select("id,workspace_id,name,type,notes")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true })
    .returns<WorkspacePayeeRow[]>();

  const payees = (data ?? []).map(mapWorkspacePayee);
  const companyCount = payees.filter((payee) => payee.type === "company").length;
  const personCount = payees.filter((payee) => payee.type === "person").length;
  const placeCount = payees.filter((payee) => payee.type === "place").length;

  return (
    <AppShell userEmail={user.email}>
      <section className="module-page">
        <div className="module-hero panel">
          <div>
            <p className="section-label">Money99 clássico</p>
            <h2>Favorecidos</h2>
            <p className="supporting-copy">
              Pessoas, empresas e lugares que reaparecem nos lançamentos e na
              agenda financeira. Manter esse cadastro vivo deixa o arquivo mais
              humano, mais rastreavel e muito mais fiel ao Money99.
            </p>
          </div>
          <div className="profile-badges">
            <span className="status-chip">{payees.length} registrados</span>
          </div>
        </div>

        {loadError ? (
          <section className="source-banner">
            <strong>Favorecidos temporariamente indisponiveis</strong>
            <span>O cadastro de favorecidos ainda nao esta disponivel neste ambiente.</span>
          </section>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        <div className="summary-strip">
          <article className="panel summary-card">
            <p className="section-label">Pessoas</p>
            <strong>{personCount}</strong>
            <p>Emprestimos, famíliares, clientes e contatos recorrentes.</p>
          </article>
          <article className="panel summary-card">
            <p className="section-label">Empresas</p>
            <strong>{companyCount}</strong>
            <p>Contas de servico, prestadores e entidades de relação frequente.</p>
          </article>
          <article className="panel summary-card">
            <p className="section-label">Lugares</p>
            <strong>{placeCount}</strong>
            <p>Mercados, postos, lojás e pontos de gasto que voltam no dia a dia.</p>
          </article>
        </div>

        <div className="module-grid">
          <section className="panel profile-card">
            <div className="panel-header">
              <div>
                <p className="section-label">Novo favorecido</p>
                <h3>Adicionar ao cadastro</h3>
              </div>
              <span className="status-chip">CRUD</span>
            </div>

            <form action={createPayee} className="entity-form profile-form">
              <label>
                Nome
                <input name="name" placeholder="Ex.: Diego Karpejáne" required />
              </label>

              <label>
                Tipo
                <select defaultValue="company" name="type">
                  {payeeTypeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="wide-field">
                Observações
                <textarea
                  name="notes"
                  placeholder="Ex.: cliente fixo, credor, servico essencial ou relação importante."
                  rows={4}
                />
              </label>

              <div className="form-actions">
                <button className="primary-button" type="submit">
                  Salvar favorecido
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Cadastro atual</p>
                <h3>Base de relacionamento do arquivo</h3>
              </div>
            </div>

            <div className="record-list">
              {payees.length ? (
                payees.map((payee) => (
                  <article className="record-card" key={payee.id}>
                    <div className="record-headline">
                      <div>
                        <strong>{payee.name}</strong>
                        <p className="micro-copy">{payeeTypeLabels[payee.type]}</p>
                      </div>
                    </div>

                    <form action={updatePayee} className="entity-form compact-form">
                      <input name="itemId" type="hidden" value={payee.id} />

                      <label>
                        Nome
                        <input defaultValue={payee.name} name="name" required />
                      </label>

                      <label>
                        Tipo
                        <select defaultValue={payee.type} name="type">
                          {payeeTypeOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="wide-field">
                        Observações
                        <textarea defaultValue={payee.notes} name="notes" rows={3} />
                      </label>

                      <div className="form-actions">
                        <button className="ghost-button danger-button" formAction={deletePayee} type="submit">
                          Excluir
                        </button>
                        <button className="primary-button" type="submit">
                          Salvar favorecido
                        </button>
                      </div>
                    </form>
                  </article>
                ))
              ) : (
                <article className="empty-state">
                  <strong>Nenhum favorecido cadastrado ainda.</strong>
                  <p>Comece pelos nomês e lugares que mais aparecem nos seus movimentos.</p>
                </article>
              )}
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
