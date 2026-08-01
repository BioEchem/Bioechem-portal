import type { createClient } from "@/lib/supabase/server";
import type { createServiceRoleClient } from "@/lib/supabase/admin";

export type SupabaseServer = Awaited<ReturnType<typeof createClient>>;
export type SupabaseAdmin = NonNullable<ReturnType<typeof createServiceRoleClient>>;
