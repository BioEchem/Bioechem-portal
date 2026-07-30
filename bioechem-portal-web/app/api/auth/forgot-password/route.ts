import { authError, authOk, isErrorResponse, readJsonBody } from "@/lib/auth/api-response";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (isErrorResponse(parsed)) return parsed;

  const body = parsed.body as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email) {
    return authError("Email is required.", 400);
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${AUTH_ROUTES.resetPassword}`,
  });

  if (error) {
    return authError(error.message, 400);
  }

  // Always return ok to avoid leaking whether the email exists
  return authOk({ ok: true as const });
}
