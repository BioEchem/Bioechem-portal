import { createClient } from "@/lib/supabase/server";

export type SignOutResult =
  | { ok: true }
  | { ok: false; message: string };

/** Ends the Supabase session and clears auth cookies. */
export async function signOut(): Promise<SignOutResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}
