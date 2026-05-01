import { createClient } from "@supabase/supabase-js";
import { assertSupabaseConfig } from "@/lib/supabase/config";

export function createSupabaseAdminClient() {
  const { url } = assertSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for privileged server operations.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
