import { createServiceRoleClient } from "@/lib/supabase/admin";

/** True if this email is already registered (auth.users or profiles). */
export async function isEmailAlreadyRegistered(email: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return false;
  }

  const normalized = email.trim().toLowerCase();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", normalized)
    .maybeSingle();

  if (profileError) {
    console.error("isEmailAlreadyRegistered profiles select:", profileError.message);
  }

  if (profile) {
    return true;
  }

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    console.error("isEmailAlreadyRegistered listUsers:", error.message);
    return false;
  }

  return data.users.some(
    (user) => user.email?.trim().toLowerCase() === normalized,
  );
}
