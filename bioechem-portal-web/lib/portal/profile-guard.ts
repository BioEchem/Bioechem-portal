import { requireSession } from "@/lib/auth/session";
import {
  getProfileCompletionStatus,
  type ProfileCompletionFields,
} from "@/lib/profile/completion";
import { PORTAL_PROFILE_COMPLETION_SELECT } from "@/lib/portal/profile-select";

type PortalProfileSession = ProfileCompletionFields & {
  role: string | null;
  approval_status: import("@/lib/auth/session").ApprovalStatus | null;
};

/** Loads session + participant profile completion status for portal pages. */
export async function loadPortalProfileCompletion() {
  const session = await requireSession<PortalProfileSession>({
    requireApproved: true,
    profileSelect: `approval_status, ${PORTAL_PROFILE_COMPLETION_SELECT}`,
  });

  return {
    ...session,
    profileCompletion: getProfileCompletionStatus(session.profile),
  };
}

/** True when a participant must complete minimum profile before accessing a feature. */
export function participantNeedsMinimumProfile(
  role: string | null,
  status: ReturnType<typeof getProfileCompletionStatus>,
): boolean {
  return role === "participant" && !status.hasMinimum;
}
