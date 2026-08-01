import type { NextResponse } from "next/server";

import { authError } from "@/lib/auth/api-response";
import type { AuthApiError } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";

import type { SupabaseServer } from "@/lib/supabase/types";

type RequireBioechemAdminResult =
  | { ok: true; supabase: SupabaseServer; adminUserId: string }
  | { ok: false; response: NextResponse<AuthApiError> };

/** Ensures the caller is a signed-in, approved BioEchem admin (for API routes). */
export async function requireBioechemAdmin(): Promise<RequireBioechemAdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: authError("Sign in required.", 401) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approval_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.role !== "bioechem_admin" ||
    profile.approval_status !== "approved"
  ) {
    return { ok: false, response: authError("Forbidden.", 403) };
  }

  return { ok: true, supabase, adminUserId: user.id };
}
