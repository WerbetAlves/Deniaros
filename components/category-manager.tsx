"use client";

import { useMemo, useState } from "react";
import {
  createCategory,
  deleteCategory,
  installMoney99Categories,
  updateCategory
} from "@/app/categories/actions";
import {
  categoryKindLabels,
  categoryKindOptions,
  type WorkspaceCategory
} from "@/lib/finance-admin";
import { getClassicCategoryGroup, money99CategoryTree } from "@/lib/money99-categories";

type CategoryManagerProps = {
  categories: WorkspaceCategory[];
  error?: string;
  success?: string;
  loadError?: string;
};

type ModalMode = "new" | "edit" | "move" | "delete" | null;
type KindFilter = "all" | WorkspaceCategory["kind"];

export function CategoryManager({
  categories,
  error,
  success,
  loadError
}: CategoryManagerProps) {
  const [selectedId, setSelectedId] = useState(categories[0]?.id ?? "");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");

  const selectedCategory =
    categories.find((category) => category.id === selectedId) ?? categories[0];

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return money99CategoryTree
      .filter((section) => kindFilter === "all" || section.kind === kindFilter)
      .map((section) => {
        const items = sortCategoriesForSection(
          categories.filter((category) => category.kind === section.kind)
        ).filter((category) => {
          if (!normalizedQuery) {
            return true;
          }

          const parent = getParent(category, categories);
          const text = `${category.name} ${parent?.name ?? ""} ${getClassicCategoryGroup(
            category,
            categories
          )}`.toLowerCase();

          return text.includes(normalizedQuery);
        });

        return { ...section, items };
      });
  }, [categories, kindFilter, query]);

  const topLevelCategories = categories.filter((category) => !category.parentId);
  const parentChoices = topLevelCategories.filter(
    (category) => category.kind === selectedCategory?.kind && category.id !== selectedCategory?.id
  );
  const stats = {
    expense: categories.filter((category) => category.kind === "expense").length,
    income: categories.filter((category) => category.kind === "income").length,
    subcategories: categories.filter((category) => category.parentId).length
  };

  const closeModal = () => setModalMode(null);

  return (
    <section className="category-workspace">
      <div className="module-hero panel category-hero">
        <div>
          <p className="section-label">Money99 clássico</p>
          <h2>Categorias</h2>
          <p className="supporting-copy">
            A base de classificação do Deniaros. Use esta tela para manter categorias,
            subcategorias e grupos alinhados ao jeito que o Money99 organizava a vida financeira.
          </p>
        </div>
        <form action={installMoney99Categories}>
          <button className="primary-button" type="submit">
            Instalar estrutura Money99
          </button>
        </form>
      </div>

      {loadError ? (
        <section className="source-banner">
          <strong>Categorias temporariamente indisponiveis</strong>
          <span>O cadastro de categorias ainda nao esta disponivel neste ambiente.</span>
        </section>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <div className="summary-strip category-summary">
        <article className="panel summary-card">
          <p className="section-label">Despesas</p>
          <strong>{stats.expense}</strong>
          <p>Custos, contas, reservas e consumo organizados por finalidade.</p>
        </article>
        <article className="panel summary-card">
          <p className="section-label">Rendimentos</p>
          <strong>{stats.income}</strong>
          <p>Salários, investimentos, reembolsos e outras entradas.</p>
        </article>
        <article className="panel summary-card">
          <p className="section-label">Subcategorias</p>
          <strong>{stats.subcategories}</strong>
          <p>O nível fino para relatórios, orçamento e previsões mais inteligentes.</p>
        </article>
      </div>

      <div className="category-console panel">
        <aside className="category-console-rail" aria-label="Seções de listas">
          <div>
            <h3>Categorias</h3>
            <span>e Favorecidos</span>
          </div>
          {["Favoritos", "Categorias", "Config. categ. imposto", "Classificação 1", "Classificação 2"].map(
            (item) => (
              <button
                aria-pressed={item === "Categorias"}
                className={item === "Categorias" ? "active" : ""}
                key={item}
                type="button"
              >
                {item}
              </button>
            )
          )}
        </aside>

        <div className="category-console-main">
          <header className="category-console-header">
            <div>
              <p className="section-label">Listas</p>
              <h3>Categorias, subcategorias e grupos de categorias</h3>
            </div>
            <div className="category-filter-row" aria-label="Filtros de categoria">
              {[
                ["all", "Todas"],
                ["expense", "Despesas"],
                ["income", "Rendimentos"]
              ].map(([id, label]) => (
                <button
                  aria-pressed={kindFilter === id}
                  className={kindFilter === id ? "active" : ""}
                  key={id}
                  onClick={() => setKindFilter(id as KindFilter)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </header>

          <div className="category-viewbar">
            <span>Visualizar: Categorias, subcategorias e grupos de categorias</span>
            <input
              aria-label="Buscar categoria"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar categoria ou grupo"
              value={query}
            />
          </div>

          <div className="category-table" role="table" aria-label="Categorias cadastradas">
            <div className="category-table-head" role="row">
              <span role="columnheader">Categoria</span>
              <span role="columnheader">Grupo de categorias</span>
            </div>

            <div className="category-table-body">
              {filteredSections.map((section) => (
                <div className="category-section" key={section.kind}>
                  <div className="category-section-title">{section.heading}</div>
                  {section.items.length ? (
                    section.items.map((category) => {
                      const parent = getParent(category, categories);
                      const selected = selectedCategory?.id === category.id;

                      return (
                        <button
                          className={`category-row ${selected ? "selected" : ""} ${
                            parent ? "subcategory" : ""
                          }`}
                          key={category.id}
                          onDoubleClick={() => setModalMode("edit")}
                          onClick={() => setSelectedId(category.id)}
                          role="row"
                          type="button"
                        >
                          <span role="cell">{parent ? `- ${category.name}` : category.name}</span>
                          <span role="cell">{getClassicCategoryGroup(category, categories)}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="category-empty-row">Nenhuma categoria neste filtro.</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <footer className="category-action-bar">
            <button
              className="ghost-button"
              disabled={!selectedCategory}
              onClick={() => setModalMode("edit")}
              type="button"
            >
              Ir para categoria
            </button>
            <button className="ghost-button" onClick={() => setModalMode("new")} type="button">
              Novo...
            </button>
            <button
              className="ghost-button"
              disabled={!selectedCategory}
              onClick={() => setModalMode("move")}
              type="button"
            >
              Mover...
            </button>
            <button
              className="ghost-button"
              disabled={!selectedCategory}
              onClick={() => setModalMode("edit")}
              type="button"
            >
              Modificar...
            </button>
            <button
              className="ghost-button danger-button"
              disabled={!selectedCategory}
              onClick={() => setModalMode("delete")}
              type="button"
            >
              Excluir
            </button>
          </footer>
        </div>
      </div>

      {modalMode ? (
        <div className="category-modal-backdrop" role="presentation">
          <section className="category-modal panel" role="dialog" aria-modal="true">
            <button
              aria-label="Fechar"
              className="modal-close"
              onClick={closeModal}
              type="button"
            >
              ×
            </button>

            {modalMode === "new" ? (
              <CategoryForm
                categories={topLevelCategories}
                mode="new"
                onCancel={closeModal}
                preferredKind={kindFilter === "all" ? "expense" : kindFilter}
              />
            ) : null}

            {modalMode === "edit" && selectedCategory ? (
              <CategoryForm
                categories={parentChoices}
                category={selectedCategory}
                mode="edit"
                onCancel={closeModal}
              />
            ) : null}

            {modalMode === "move" && selectedCategory ? (
              <MoveCategoryForm
                category={selectedCategory}
                onCancel={closeModal}
                parentChoices={parentChoices}
              />
            ) : null}

            {modalMode === "delete" && selectedCategory ? (
              <DeleteCategoryForm category={selectedCategory} onCancel={closeModal} />
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}

function CategoryForm({
  categories,
  category,
  mode,
  onCancel,
  preferredKind = "expense"
}: {
  categories: WorkspaceCategory[];
  category?: WorkspaceCategory;
  mode: "new" | "edit";
  onCancel: () => void;
  preferredKind?: WorkspaceCategory["kind"];
}) {
  const [currentKind, setCurrentKind] = useState<WorkspaceCategory["kind"]>(
    category?.kind ?? preferredKind
  );
  const action = mode === "new" ? createCategory : updateCategory;
  const title = mode === "new" ? "Nova categoria" : "Modificar categoria";
  const parentOptions = categories.filter((option) => option.kind === currentKind);

  return (
    <form action={action} className="category-modal-form">
      <div>
        <p className="section-label">{mode === "new" ? "Cadastro" : "Edição"}</p>
        <h3>{title}</h3>
        <p className="micro-copy">
          Categorias principais agrupam a visão do sistema. Subcategorias refinam relatórios,
          agenda, orçamento e previsões.
        </p>
      </div>

      {category ? <input name="itemId" type="hidden" value={category.id} /> : null}

      <label>
        Nome
        <input name="name" defaultValue={category?.name} placeholder="Ex.: Transporte" required />
      </label>

      <label>
        Tipo
        <select
          name="kind"
          onChange={(event) => setCurrentKind(event.target.value as WorkspaceCategory["kind"])}
          value={currentKind}
        >
          {categoryKindOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Categoria principal
        <select name="parentId" defaultValue={category?.parentId ?? ""}>
          <option value="">Sem categoria principal</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} · {categoryKindLabels[option.kind]}
            </option>
          ))}
        </select>
      </label>

      <div className="form-actions">
        <button className="ghost-button" onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className="primary-button" type="submit">
          Salvar
        </button>
      </div>
    </form>
  );
}

function MoveCategoryForm({
  category,
  onCancel,
  parentChoices
}: {
  category: WorkspaceCategory;
  onCancel: () => void;
  parentChoices: WorkspaceCategory[];
}) {
  return (
    <form action={updateCategory} className="category-modal-form">
      <div>
        <p className="section-label">Mobilização</p>
        <h3>Mover categoria</h3>
        <p className="micro-copy">
          Reposicione a categoria dentro de uma família principal sem mudar o histórico já lançado.
        </p>
      </div>

      <input name="itemId" type="hidden" value={category.id} />
      <input name="name" type="hidden" value={category.name} />
      <input name="kind" type="hidden" value={category.kind} />

      <label>
        Categoria principal
        <select name="parentId" defaultValue={category.parentId ?? ""}>
          <option value="">Sem categoria principal</option>
          {parentChoices.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>

      <div className="form-actions">
        <button className="ghost-button" onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className="primary-button" type="submit">
          Mover
        </button>
      </div>
    </form>
  );
}

function DeleteCategoryForm({
  category,
  onCancel
}: {
  category: WorkspaceCategory;
  onCancel: () => void;
}) {
  return (
    <form action={deleteCategory} className="category-modal-form">
      <div>
        <p className="section-label">Exclusão</p>
        <h3>Excluir categoria</h3>
        <p className="micro-copy">
          Esta ação remove “{category.name}” da lista. Use apenas quando a categoria não fizer
          parte da organização atual.
        </p>
      </div>

      <input name="itemId" type="hidden" value={category.id} />

      <div className="form-actions">
        <button className="ghost-button" onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className="ghost-button danger-button" type="submit">
          Excluir categoria
        </button>
      </div>
    </form>
  );
}

function getParent(category: WorkspaceCategory, categories: WorkspaceCategory[]) {
  return category.parentId
    ? categories.find((option) => option.id === category.parentId)
    : undefined;
}

function sortCategoriesForSection(categories: WorkspaceCategory[]) {
  const parents = categories
    .filter((category) => !category.parentId)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const children = categories
    .filter((category) => category.parentId)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return parents.flatMap((parent) => [
    parent,
    ...children.filter((child) => child.parentId === parent.id)
  ]);
}
