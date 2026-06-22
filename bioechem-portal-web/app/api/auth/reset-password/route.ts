import { authError, authOk, isErrorResponse, readJsonBody } from "@/lib/auth/api-response";
import { createClient } from "@/lib/supabase/server";

const MIN_PASSWORD_LENGTH = 6;

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (isErrorResponse(parsed)) return parsed;

  const body = parsed.body as Record<string, unknown>;
  const password = typeof body.password === "string" ? body.password : "";

  if (!password) {
    return authError("New password is required.", 400);
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return authError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, 400);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return authError(
      "Your reset link has expired or is invalid. Please request a new one.",
      401,
    );
  }

  // Check if the new password is the same as the current one
  const { error: samePasswordError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  });
  if (!samePasswordError) {
    return authError("New password cannot be the same as your current password.", 400);
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return authError(error.message, 400);
  }

  // Sign out the recovery session so user logs in fresh with their new password
  await supabase.auth.signOut();

  return authOk({ ok: true as const });
}
