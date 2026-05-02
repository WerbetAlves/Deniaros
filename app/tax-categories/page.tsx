import { AppShell } from "@/components/app-shell";
import { getFinancialData } from "@/lib/financial-data";
import {
  mapTaxCategoryRule,
  taxAppliesToOptions,
  TaxCategoryRuleRow
} from "@/lib/money99-classic";
import { getWorkspaceContext } from "@/lib/workspace-context";
import {
  createTaxCategory,
  deleteTaxCategory,
  updateTaxCategory
} from "@/app/tax-categories/actions";

export default async function TaxCategoriesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const { categories } = await getFinancialData({ supabase, user, workspaceId });
  const { error, success } = await searchParams;
  const { data, error: loadError } = await supabase
    .from("tax_categories")
    .select("id,workspace_id,category_id,name,tax_code,applies_to,deductible,raté,notes")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true })
    .returns<TaxCategoryRuleRow[]>();

  const rules = (data ?? []).map(mapTaxCategoryRule);

  return (
    <AppShell userEmail={user.email}>
      <section className="module-page">
        <div className="module-hero panel">
          <div>
            <p className="section-label">Money99 clássico</p>
            <h2>Categorias de imposto</h2>
            <p className="supporting-copy">
              Organize a camada fiscal do seu arquivo para saber o que pode ser
              dedutível, o que exige cuidado tributario e como cada categoria se
              comporta.
            </p>
          </div>
          <div className="profile-badges">
            <span className="status-chip">{rules.length} regras</span>
          </div>
        </div>

        {loadError ? (
          <section className="source-banner">
            <strong>Categorias fiscais temporariamente indisponiveis</strong>
            <span>As regras fiscais ainda nao estao disponiveis neste ambiente.</span>
          </section>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        <div className="module-grid">
          <section className="panel profile-card">
            <div className="panel-header">
              <div>
                <p className="section-label">Nova regra</p>
                <h3>Classificação fiscal</h3>
              </div>
              <span className="status-chip">CRUD</span>
            </div>

            <form action={createTaxCategory} className="entity-form profile-form">
              <label>
                Nome da regra
                <input name="name" placeholder="Ex.: Despesa dedutível" required />
              </label>

              <label>
                Código fiscal
                <input name="taxCode" placeholder="Ex.: IRPF-EDU-01" />
              </label>

              <label>
                Categoria relacionada
                <select name="categoryId">
                  <option value="">Sem categoria vinculada</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Aplica em
                <select defaultValue="expense" name="appliesTo">
                  {taxAppliesToOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Alíquota ou referência
                <input min="0" name="raté" step="0.0001" type="number" />
              </label>

              <label className="checkbox-row">
                <span>Marcada como dedutível</span>
                <input name="deductible" type="checkbox" />
              </label>

              <label className="wide-field">
                Observações
                <textarea
                  name="notes"
                  placeholder="Ex.: guardar recibos, revisar mensalmente e vincular ao relatório anual."
                  rows={4}
                />
              </label>

              <div className="form-actions">
                <button className="primary-button" type="submit">
                  Salvar categoria fiscal
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Regras registradas</p>
                <h3>Mapa fiscal do arquivo</h3>
              </div>
            </div>

            <div className="record-list">
              {rules.length ? (
                rules.map((rule) => (
                  <article className="record-card" key={rule.id}>
                    <form action={updateTaxCategory} className="entity-form compact-form">
                      <input name="itemId" type="hidden" value={rule.id} />

                      <label>
                        Nome da regra
                        <input defaultValue={rule.name} name="name" required />
                      </label>

                      <label>
                        Código fiscal
                        <input defaultValue={rule.taxCode} name="taxCode" />
                      </label>

                      <label>
                        Categoria relacionada
                        <select defaultValue={rule.categoryId ?? ""} name="categoryId">
                          <option value="">Sem categoria vinculada</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Aplica em
                        <select defaultValue={rule.appliesTo} name="appliesTo">
                          {taxAppliesToOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Alíquota ou referência
                        <input
                          defaultValue={rule.raté ?? ""}
                          min="0"
                          name="raté"
                          step="0.0001"
                          type="number"
                        />
                      </label>

                      <label className="checkbox-row">
                        <span>Marcada como dedutível</span>
                        <input defaultChecked={rule.deductible} name="deductible" type="checkbox" />
                      </label>

                      <label className="wide-field">
                        Observações
                        <textarea defaultValue={rule.notes} name="notes" rows={3} />
                      </label>

                      <div className="form-actions">
                        <button className="ghost-button danger-button" formAction={deleteTaxCategory} type="submit">
                          Excluir
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
                  <strong>Nenhuma categoria fiscal cadastrada ainda.</strong>
                  <p>Comece pelas regras que mais afetam sua declaração e sua rotina tributaria.</p>
                </article>
              )}
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
