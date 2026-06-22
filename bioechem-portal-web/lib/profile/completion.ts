import { parseEmergencyContacts } from "@/lib/profile/emergency-contacts";
import {
  hasRequiredAddress,
  profileRowToAddress,
} from "@/lib/profile/address";

export type ProfileCompletionFields = {
  role: string | null;
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  address_street: string | null;
  address_apt: string | null;
  address_city: string | null;
  address_state: string | null;
  address_country: string | null;
  address_zip: string | null;
  phone: string | null;
  state: string | null;
  school_id: string | null;
  other_school_name: string | null;
  cohort_id: string | null;
  emergency_contacts: unknown;
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

function hasValidEmergencyContacts(value: unknown): boolean {
  const contacts = parseEmergencyContacts(value);
  return contacts.some(
    (contact) =>
      contact.name.trim() &&
      contact.phone.trim() &&
      contact.relationship.trim(),
  );
}

export function getMinimumMissingLabels(profile: ProfileCompletionFields): string[] {
  const missing: string[] = [];
  const address = profileRowToAddress(profile);

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

  if (!profile.state?.trim()) {
    missing.push("State");
    schoolIncomplete = true;
  }

  if (!hasValidEmergencyContacts(profile.emergency_contacts)) {
    missing.push("Emergency contact");
    schoolIncomplete = true;
  }

  return {
    labels: missing,
    personalIncomplete,
    schoolIncomplete,
  };
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
