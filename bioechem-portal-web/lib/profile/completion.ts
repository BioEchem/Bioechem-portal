import { hasRequiredAddress, addressRowToAddress } from "@/lib/profile/address";

export type ProfileCompletionFields = {
  role: string | null;
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  phone: string | null;
  school_id: string | null;
  other_school_name: string | null;
  cohort_id: string | null;
  profile_addresses: {
    street: string | null;
    apt: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    zip: string | null;
    reg_state: string | null;
  } | null;
  profile_emergency_contacts: {
    name: string;
    phone: string;
    relationship: string;
  }[];
};

export type ProfileCompletionStatus = {
  /** Enough to unlock courses, assignments, and messaging. */
  hasMinimum: boolean;
  /** All participant profile fields saved. */
  isFullyComplete: boolean;
  missingMinimumLabels: string[];
  missingFullLabels: string[];
  missingSections: ("personal" | "school")[];
};

function hasValidEmergencyContacts(
  contacts: { name: string; phone: string; relationship: string }[],
): boolean {
  return contacts.some(
    (c) => c.name.trim() && c.phone.trim() && c.relationship.trim(),
  );
}

export function getMinimumMissingLabels(profile: ProfileCompletionFields): string[] {
  const missing: string[] = [];
  const address = addressRowToAddress(profile.profile_addresses);

  if (!profile.first_name?.trim()) missing.push("First name");
  if (!profile.last_name?.trim()) missing.push("Last name");
  if (!profile.phone?.trim()) missing.push("Phone number");
  if (!hasRequiredAddress(address)) missing.push("Address");

  return missing;
}

function getFullMissingLabels(profile: ProfileCompletionFields): {
  labels: string[];
  personalIncomplete: boolean;
  schoolIncomplete: boolean;
} {
  const missing = [...getMinimumMissingLabels(profile)];
  let personalIncomplete = missing.length > 0;
  let schoolIncomplete = false;

  if (profile.age == null || profile.age < 1) {
    missing.push("Age");
    personalIncomplete = true;
  }

  const hasSchool =
    Boolean(profile.school_id) || Boolean(profile.other_school_name?.trim());

  if (!hasSchool) {
    missing.push("School");
    schoolIncomplete = true;
  }

  if (!profile.profile_addresses?.reg_state?.trim()) {
    missing.push("State");
    schoolIncomplete = true;
  }

  if (!hasValidEmergencyContacts(profile.profile_emergency_contacts ?? [])) {
    missing.push("Emergency contact");
    schoolIncomplete = true;
  }

  return { labels: missing, personalIncomplete, schoolIncomplete };
}

/** Profile completion tiers for participants. Other roles only check minimum personal fields. */
export function getProfileCompletionStatus(
  profile: ProfileCompletionFields,
): ProfileCompletionStatus {
  const missingMinimumLabels = getMinimumMissingLabels(profile);

  if (profile.role !== "participant") {
    return {
      hasMinimum: missingMinimumLabels.length === 0,
      isFullyComplete: missingMinimumLabels.length === 0,
      missingMinimumLabels,
      missingFullLabels: missingMinimumLabels,
      missingSections: missingMinimumLabels.length > 0 ? ["personal"] : [],
    };
  }

  const full = getFullMissingLabels(profile);
  const missingSections: ("personal" | "school")[] = [];

  if (full.personalIncomplete) missingSections.push("personal");
  if (full.schoolIncomplete) missingSections.push("school");

  return {
    hasMinimum: missingMinimumLabels.length === 0,
    isFullyComplete: full.labels.length === 0,
    missingMinimumLabels,
    missingFullLabels: full.labels,
    missingSections,
  };
}

/** Portal routes that require minimum profile details for participants. */
export const PARTICIPANT_GATED_ROUTES = [
  "/courses",
  "/assignments",
  "/messaging",
] as const;

export function isParticipantGatedRoute(pathname: string): boolean {
  return PARTICIPANT_GATED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
