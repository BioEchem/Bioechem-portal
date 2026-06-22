/** Human-readable labels for profile display. */

export const ROLE_LABELS: Record<string, string> = {
  participant: "Participant",
  teacher: "Teacher",
  school_admin: "School admin",
  industry_partner: "Partner",
  shareholder: "Shareholder",
  bioechem_admin: "BioEchem admin",
};

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
};

export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return "—";
  return ROLE_LABELS[role] ?? role;
}

export function getApprovalStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return APPROVAL_STATUS_LABELS[status] ?? status;
}

type SchoolRelation = { name: string } | { name: string }[] | null | undefined;

export function getSchoolDisplayName(profile: {
  other_school_name?: string | null;
  schools?: SchoolRelation;
}): string | null {
  if (profile.other_school_name) return profile.other_school_name;

  const school = profile.schools;
  if (!school) return null;
  if (Array.isArray(school)) return school[0]?.name ?? null;
  return school.name ?? null;
}

export function getCohortDisplayName(cohorts: SchoolRelation): string | null {
  if (!cohorts) return null;
  if (Array.isArray(cohorts)) return cohorts[0]?.name ?? null;
  return cohorts.name ?? null;
}

const EMPTY = "—";

/** Display name from profile full_name, falling back to email local part. */
export function getDisplayName(
  fullName: string | null | undefined,
  email: string | null | undefined,
  fallback = "there",
): string {
  const name = fullName?.trim();
  if (name) return name;
  if (email) return email.split("@")[0] || fallback;
  return fallback;
}

/** Two-letter initials for avatars. */
export function getInitials(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string {
  const name = fullName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "BE";
}

/** Non-null display string with em-dash fallback. */
export function displayOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : EMPTY;
}
