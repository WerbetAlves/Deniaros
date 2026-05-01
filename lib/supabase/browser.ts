import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseConfig } from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = assertSupabaseConfig();

  return createBrowserClient(url, publishableKey);
}
