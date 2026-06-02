import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";

/** Server-only client (bypasses RLS). Requires SUPABASE_SERVICE_ROLE_KEY. */
export function createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    return null;
  }

  const { url } = getSupabaseEnv();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
