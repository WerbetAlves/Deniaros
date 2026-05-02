import { AppShell } from "@/components/app-shell";
import { CategoryManager } from "@/components/category-manager";
import { mapWorkspaceCategory, type WorkspaceCategoryRow } from "@/lib/finance-admin";
import { getWorkspaceContext } from "@/lib/workspace-context";

export default async function CategoriesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const { error, success } = await searchParams;
  const { data, error: loadError } = await supabase
    .from("categories")
    .select("id,workspace_id,parent_id,name,kind")
    .eq("workspace_id", workspaceId)
    .order("kind", { ascending: true })
    .order("name", { ascending: true })
    .returns<WorkspaceCategoryRow[]>();

  const categories = (data ?? []).map(mapWorkspaceCategory);

  return (
    <AppShell userEmail={user.email}>
      <section className="module-page">
        <CategoryManager
          categories={categories}
          error={error}
          loadError={
            loadError
              ? "O cadastro de categorias ainda nao esta disponivel neste ambiente."
              : undefined
          }
          success={success}
        />
      </section>
    </AppShell>
  );
}
