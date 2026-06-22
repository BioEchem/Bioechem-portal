import { createClient } from "@/lib/supabase/server";

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; message: string };

const MIN_PASSWORD_LENGTH = 6;

/** Verifies the current password, then updates the signed-in user's password. */
export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: "New password must be at least 6 characters.",
    };
  }

  if (currentPassword === newPassword) {
    return {
      ok: false,
      message: "New password must be different from your current password.",
    };
  }

  const supabase = await createClient();

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (verifyError) {
    return { ok: false, message: "Current password is incorrect." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  return { ok: true };
}
