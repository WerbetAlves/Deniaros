import { redirect } from "next/navigation";
import { ensureDefaultWorkspace } from "@/lib/workspace-bootstrap";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getWorkspaceContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspaceId = await ensureDefaultWorkspace(supabase, user);

  return {
    supabase,
    user,
    workspaceId
  };
}
