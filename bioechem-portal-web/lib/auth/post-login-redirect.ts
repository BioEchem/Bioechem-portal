import { AUTH_ROUTES } from "@/lib/auth/routes";
import type { ProfileCompletionFields } from "@/lib/profile/completion";
import { needsOnboarding } from "@/lib/profile/onboarding";
import { PORTAL_PROFILE_COMPLETION_SELECT } from "@/lib/portal/profile-select";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseServer } from "@/lib/supabase/types";

type ProfileRedirectFields = ProfileCompletionFields & {
  approval_status: string | null;
};

/** Where to send a signed-in user based on profile approval and role. */
export async function resolvePostLoginRedirect(
  supabase: SupabaseServer,
  userId: string,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select(`approval_status, ${PORTAL_PROFILE_COMPLETION_SELECT}`)
    .eq("id", userId)
    .maybeSingle<ProfileRedirectFields>();

  if (profile?.approval_status === "approved") {
    if (needsOnboarding(profile)) {
      return AUTH_ROUTES.completeProfile;
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
