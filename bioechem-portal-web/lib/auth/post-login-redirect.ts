import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";
import type { createClient as createClientFn } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClientFn>>;

type ProfileRedirectFields = {
  approval_status: string | null;
  role: string | null;
};

/** Where to send a signed-in user based on profile approval and role. */
export async function resolvePostLoginRedirect(
  supabase: SupabaseServer,
  userId: string,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("approval_status, role")
    .eq("id", userId)
    .maybeSingle<ProfileRedirectFields>();

  if (profile?.approval_status === "approved") {
    if (profile.role === "bioechem_admin") {
      return AUTH_ROUTES.adminApprovals;
    }
    if (profile.role === "school_admin") {
      return AUTH_ROUTES.schoolHub;
    }
    return AUTH_ROUTES.dashboard;
  }

  if (profile?.approval_status === "rejected") {
    return AUTH_ROUTES.accessDenied;
  }

  return AUTH_ROUTES.pendingApproval;
}

/** Resolves redirect after login API establishes the session. */
export async function resolveLoginRedirect(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return AUTH_ROUTES.login;
  }

  return resolvePostLoginRedirect(supabase, user.id);
}
