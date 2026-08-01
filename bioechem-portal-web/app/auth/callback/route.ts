import { NextResponse } from "next/server";

import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Exchanges a Supabase PKCE code for a session, then redirects to `next`.
 * Used by password-reset and OAuth flows.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? AUTH_ROUTES.dashboard;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`${AUTH_ROUTES.forgotPassword}?error=link_expired`, url.origin),
      );
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
