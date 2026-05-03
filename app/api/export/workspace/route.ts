import { ensureDefaultWorkspace } from "@/lib/workspace-bootstrap";
import { buildWorkspaceBackupFileName, workspaceScopedBackupTables } from "@/lib/backup";
import { recordDataAccessEvent } from "@/lib/privacy";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ExportTableResult = {
  data: unknown[];
  skipped?: string;
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const workspaceId = await ensureDefaultWorkspace(supabase, user);
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (workspaceError || !workspace) {
    return Response.json(
      { error: workspaceError?.message ?? "Workspace não encontrado." },
      { status: 404 }
    );
  }

  await recordDataAccessEvent(supabase, {
    accessReason: "Backup completo exportado pelo usuario.",
    accessScope: "backup_export",
    metadata: {
      exportVersion: 1
    },
    user,
    workspaceId
  });

  const tables: Record<string, ExportTableResult> = {};

  for (const table of workspaceScopedBackupTables) {
    tables[table] = await loadWorkspaceTable(supabase, table, workspaceId);
  }

  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const exportedAt = new Date().toISOString();
  const payload = {
    app: "Deniaros",
    exportVersion: 1,
    exportedAt,
    user: {
      email: user.email,
      id: user.id
    },
    workspace,
    userProfile,
    tables
  };
  const fileName = buildWorkspaceBackupFileName(workspace.name, exportedAt);

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function loadWorkspaceTable(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: string,
  workspaceId: string
): Promise<ExportTableResult> {
  const { data, error } = await supabase.from(table).select("*").eq("workspace_id", workspaceId);

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return {
        data: [],
        skipped: `Tabela indisponível nesta base: ${error.message}`
      };
    }

    throw new Error(error.message);
  }

  return { data: data ?? [] };
}
