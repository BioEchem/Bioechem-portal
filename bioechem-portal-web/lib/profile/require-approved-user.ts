import type { NextResponse } from "next/server";

import { authError } from "@/lib/auth/api-response";
import type { AuthApiError } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";

import type { SupabaseServer } from "@/lib/supabase/types";

type RequireApprovedUserResult =
  | {
      ok: true;
      supabase: SupabaseServer;
      userId: string;
      role: string;
    }
  | { ok: false; response: NextResponse<AuthApiError> };

/** Ensures the caller is a signed-in user with an approved profile (for API routes). */
export async function requireApprovedUser(): Promise<RequireApprovedUserResult> {
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

  if (!profile || profile.approval_status !== "approved") {
    return { ok: false, response: authError("Forbidden.", 403) };
  }

  return {
    ok: true,
    supabase,
    userId: user.id,
    role: profile.role,
  };
}
