import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type SessionProfile = {
  approval_status: ApprovalStatus | null;
  role: string | null;
  school_id?: string | null;
  schools?: { name: string } | { name: string }[] | null;
};

export type AuthSession = {
  supabase: SupabaseServer;
  user: User;
  profile: SessionProfile;
};

type RequireSessionOptions = {
  profileSelect?: string;
  requireApproved?: boolean;
  requiredRole?: string;
  wrongRoleRedirect?: string;
};

/** Loads the signed-in user and profile; redirects to login if unauthenticated. */
export async function requireSession(
  options: RequireSessionOptions = {},
): Promise<AuthSession> {
  const profileSelect = options.profileSelect ?? "approval_status, role";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(AUTH_ROUTES.login);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("id", user.id)
    .maybeSingle<SessionProfile>();

  if (!profile) {
    redirect(AUTH_ROUTES.pendingApproval);
  }

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

/** For `/pending-approval` — signed in, not yet approved (or rejected → access denied). */
export async function requirePendingApprovalSession(): Promise<AuthSession> {
  const session = await requireSession();

  if (session.profile.approval_status === "approved") {
    redirect(await resolvePostLoginRedirect(session.supabase, session.user.id));
  }

  if (session.profile.approval_status === "rejected") {
    redirect(AUTH_ROUTES.accessDenied);
  }

  return session;
}

/** Sends role-specific users away from the generic dashboard. */
export function redirectRoleHome(profile: SessionProfile): void {
  if (profile.role === "bioechem_admin") {
    redirect(AUTH_ROUTES.adminApprovals);
  }
  if (profile.role === "school_admin") {
    redirect(AUTH_ROUTES.schoolHub);
  }
}
