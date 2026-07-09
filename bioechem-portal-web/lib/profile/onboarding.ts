import {
  getProfileCompletionStatus,
  type ProfileCompletionFields,
} from "@/lib/profile/completion";

export type OnboardingStatus = {
  isComplete: boolean;
  missingLabels: string[];
  missingSections: ("personal" | "school")[];
};

const ROLES_REQUIRING_ONBOARDING = new Set(["participant", "teacher"]);

/** Whether an approved user must finish post-approval profile onboarding. */
export function getOnboardingStatus(
  profile: ProfileCompletionFields,
): OnboardingStatus {
  // Admins, school admins, shareholders, and industry partners skip onboarding entirely.
  if (!ROLES_REQUIRING_ONBOARDING.has(profile.role ?? "")) {
    return { isComplete: true, missingLabels: [], missingSections: [] };
  }

  if (profile.role === "participant") {
    const status = getProfileCompletionStatus(profile);
    return {
      isComplete: status.isFullyComplete,
      missingLabels: status.missingFullLabels,
      missingSections: status.missingSections,
    };
  }

  // teacher — minimum personal fields only
  const status = getProfileCompletionStatus(profile);
  const missingLabels = status.missingMinimumLabels;

  return {
    isComplete: missingLabels.length === 0,
    missingLabels,
    missingSections: missingLabels.length > 0 ? ["personal"] : [],
  };
}

export function needsOnboarding(profile: ProfileCompletionFields): boolean {
  return !getOnboardingStatus(profile).isComplete;
}
