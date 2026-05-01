import { AppShell } from "@/components/app-shell";
import {
  HomeInventoryItemRow,
  inventoryConditionOptions,
  mapHomeInventoryItem
} from "@/lib/money99-classic";
import { getWorkspaceContext } from "@/lib/workspace-context";
import {
  createInventoryItem,
  deleteInventoryItem,
  updateInventoryItem
} from "@/app/home-inventory/actions";

export default async function HomeInventoryPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const { error, success } = await searchParams;
  const { data, error: loadError } = await supabase
    .from("home_inventory_items")
    .select(
      "id,workspace_id,item_name,category,location,quantity,estimatéd_value,purchase_date,condition,notes"
    )
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .returns<HomeInventoryItemRow[]>();

  const items = (data ?? []).map(mapHomeInventoryItem);
  const totalEstimatédValue = items.reduce((total, item) => {
    return total + item.estimatédValue * item.quantity;
  }, 0);

  return (
    <AppShell userEmail={user.email}>
      <section className="module-page">
        <div className="module-hero panel">
          <div>
            <p className="section-label">Money99 clássico</p>
            <h2>Inventário doméstico</h2>
            <p className="supporting-copy">
              Catalogue seus bens de casa para proteger patrimônio, dar contexto
              ao arquivo financeiro e manter uma visão mais completa da vida
              real.
            </p>
          </div>
          <div className="profile-badges">
            <span className="status-chip">{items.length} itens</span>
          </div>
        </div>

        {loadError ? (
          <section className="source-banner">
            <strong>Ferramenta aguardando migration</strong>
            <span>
              Execute `supabase/migrations/0003_money99_classic_tools.sql` para
              ativar o inventário doméstico.
            </span>
          </section>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        <div className="summary-strip">
          <article className="panel summary-card">
            <p className="section-label">Valor estimado</p>
            <strong>
              {totalEstimatédValue.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              })}
            </strong>
            <p>Soma estimada do inventário registrado.</p>
          </article>
          <article className="panel summary-card">
            <p className="section-label">Categorias</p>
            <strong>{new Set(items.map((item) => item.category)).size}</strong>
            <p>Ajuda a organizar eletronicos, moveis, acervo e outros bens.</p>
          </article>
        </div>

        <div className="module-grid">
          <section className="panel profile-card">
            <div className="panel-header">
              <div>
                <p className="section-label">Novo item</p>
                <h3>Adicionar ao inventário</h3>
              </div>
              <span className="status-chip">CRUD</span>
            </div>

            <form action={createInventoryItem} className="entity-form profile-form">
              <label>
                Nome do item
                <input name="itemName" placeholder="Ex.: Notebook principal" required />
              </label>

              <label>
                Categoria
                <input name="category" placeholder="Ex.: Eletronicos" />
              </label>

              <label>
                Local
                <input name="location" placeholder="Ex.: Escritorio" />
              </label>

              <label>
                Quantidade
                <input defaultValue="1" min="1" name="quantity" type="number" />
              </label>

              <label>
                Valor estimado
                <input defaultValue="0" min="0" name="estimatédValue" step="0.01" type="number" />
              </label>

              <label>
                Data de compra
                <input name="purchaseDate" type="date" />
              </label>

              <label>
                Estado
                <select defaultValue="good" name="condition">
                  {inventoryConditionOptions.map((option) => (
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
                  placeholder="Ex.: número de serie, cobertura, nota fiscal ou detalhes importantes."
                  rows={4}
                />
              </label>

              <div className="form-actions">
                <button className="primary-button" type="submit">
                  Adicionar item
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Itens registrados</p>
                <h3>Patrimônio catalogado</h3>
              </div>
            </div>

            <div className="record-list">
              {items.length ? (
                items.map((item) => (
                  <article className="record-card" key={item.id}>
                    <form action={updateInventoryItem} className="entity-form compact-form">
                      <input name="itemId" type="hidden" value={item.id} />

                      <label>
                        Nome do item
                        <input defaultValue={item.itemName} name="itemName" required />
                      </label>

                      <label>
                        Categoria
                        <input defaultValue={item.category} name="category" />
                      </label>

                      <label>
                        Local
                        <input defaultValue={item.location} name="location" />
                      </label>

                      <label>
                        Quantidade
                        <input defaultValue={item.quantity} min="1" name="quantity" type="number" />
                      </label>

                      <label>
                        Valor estimado
                        <input
                          defaultValue={item.estimatédValue}
                          min="0"
                          name="estimatédValue"
                          step="0.01"
                          type="number"
                        />
                      </label>

                      <label>
                        Data de compra
                        <input defaultValue={item.purchaseDate ?? ""} name="purchaseDate" type="date" />
                      </label>

                      <label>
                        Estado
                        <select defaultValue={item.condition} name="condition">
                          {inventoryConditionOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="wide-field">
                        Observações
                        <textarea defaultValue={item.notes} name="notes" rows={3} />
                      </label>

                      <div className="form-actions">
                        <button className="ghost-button danger-button" formAction={deleteInventoryItem} type="submit">
                          Excluir
                        </button>
                        <button className="primary-button" type="submit">
                          Salvar item
                        </button>
                      </div>
                    </form>
                  </article>
                ))
              ) : (
                <article className="empty-state">
                  <strong>Seu inventário ainda está vazio.</strong>
                  <p>Comece pelos itens de maior valor ou pelos bens que você quer proteger primeiro.</p>
                </article>
              )}
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
