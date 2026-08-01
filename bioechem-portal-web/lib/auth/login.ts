import { createClient } from "@/lib/supabase/server";

export type SignInResult =
  | { ok: true }
  | { ok: false; message: string };

/** Email/password sign-in — used by the login API route (sets session cookies). */
export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<SignInResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}
