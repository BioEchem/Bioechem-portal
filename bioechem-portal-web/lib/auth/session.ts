import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import type { ProfileCompletionFields } from "@/lib/profile/completion";
import { needsOnboarding } from "@/lib/profile/onboarding";
import { PORTAL_PROFILE_COMPLETION_SELECT } from "@/lib/portal/profile-select";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseServer } from "@/lib/supabase/types";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type SessionProfile = {
  approval_status: ApprovalStatus | null;
  role: string | null;
  school_id?: string | null;
  schools?: { name: string } | { name: string }[] | null;
  rejection_reason?: string | null;
};

export type AuthSession<TProfile = SessionProfile> = {
  supabase: SupabaseServer;
  user: User;
  profile: TProfile;
};

type RequireSessionOptions = {
  profileSelect?: string;
  requireApproved?: boolean;
  requiredRole?: string;
  wrongRoleRedirect?: string;
};

type CachedSessionResult<TProfile> =
  | { kind: "unauthenticated" }
  | { kind: "profile_error" }
  | { kind: "no_profile" }
  | { kind: "ok"; supabase: SupabaseServer; user: User; profile: TProfile };

/** Deduplicates auth + profile fetches within a single request. */
const fetchSessionData = cache(
  async <TProfile extends SessionProfile>(
    profileSelect: string,
  ): Promise<CachedSessionResult<TProfile>> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { kind: "unauthenticated" };
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(profileSelect)
      .eq("id", user.id)
      .maybeSingle<TProfile>();

    if (error) {
      console.error("requireSession profile:", error.message);
      return { kind: "profile_error" };
    }

    if (!profile) {
      return { kind: "no_profile" };
    }

    return { kind: "ok", supabase, user, profile };
  },
);

/** Loads the signed-in user and profile; redirects to login if unauthenticated. */
export async function requireSession<TProfile extends SessionProfile = SessionProfile>(
  options: RequireSessionOptions = {},
): Promise<AuthSession<TProfile>> {
  const profileSelect = options.profileSelect ?? "approval_status, role";
  const result = await fetchSessionData<TProfile>(profileSelect);

  if (result.kind === "unauthenticated") {
    redirect(AUTH_ROUTES.login);
  }

  if (result.kind === "profile_error") {
    throw new Error("Could not load your profile. Please try again later.");
  }

  if (result.kind === "no_profile") {
    // Auth user exists but profile row is missing (e.g. schema was wiped).
    // Sign them out so they land cleanly on the login page.
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect(AUTH_ROUTES.login);
  }

  const { supabase, user, profile } = result;

  if (options.requireApproved && profile.approval_status !== "approved") {
    redirect(
      profile.approval_status === "rejected"
        ? AUTH_ROUTES.accessDenied
        : AUTH_ROUTES.pendingApproval,
    );
  }

  if (options.requiredRole && profile.role !== options.requiredRole) {
    redirect(options.wrongRoleRedirect ?? AUTH_ROUTES.dashboard);
  }

  return { supabase, user, profile };
}

/** For `/complete-profile` — approved users who still owe mandatory profile details. */
export async function requireCompleteProfileSession<
  TProfile extends ProfileCompletionFields & SessionProfile = ProfileCompletionFields &
    SessionProfile,
>(options: { profileSelect?: string } = {}): Promise<AuthSession<TProfile>> {
  const session = await requireSession<TProfile>({
    requireApproved: true,
    profileSelect:
      options.profileSelect ?? `approval_status, role, ${PORTAL_PROFILE_COMPLETION_SELECT}`,
  });

  if (!needsOnboarding(session.profile)) {
    redirect(AUTH_ROUTES.dashboard);
  }

  return session;
}

/** For `/pending-approval` — signed in, not yet approved (or rejected → access denied). */
export async function requirePendingApprovalSession(): Promise<
  AuthSession<SessionProfile>
> {
  const session = await requireSession();

  if (session.profile.approval_status === "approved") {
    redirect(await resolvePostLoginRedirect(session.supabase, session.user.id));
  }

  if (session.profile.approval_status === "rejected") {
    redirect(AUTH_ROUTES.accessDenied);
  }

  return session;
}

/** For `/access-denied` — signed in with a rejected profile. */
export async function requireRejectedSession(): Promise<AuthSession<SessionProfile>> {
  const session = await requireSession({
    profileSelect: "approval_status, role, rejection_reason",
  });

  if (session.profile.approval_status === "approved") {
    redirect(await resolvePostLoginRedirect(session.supabase, session.user.id));
  }

  if (session.profile.approval_status === "pending") {
    redirect(AUTH_ROUTES.pendingApproval);
  }

  return session;
}
