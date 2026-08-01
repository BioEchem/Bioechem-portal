import {
  getCohortDisplayName,
  getDisplayName,
  getRoleLabel,
  getSchoolDisplayName,
} from "@/lib/profile/display";

export type DashboardProfileField = {
  label: string;
  value: string;
};

export type DashboardProfileRow = {
  full_name: string | null;
  email: string | null;
  role: string | null;
  schools?: { name: string } | { name: string }[] | null;
  cohorts?: { name: string } | { name: string }[] | null;
};

export type DashboardUserContext = {
  displayName: string;
  email: string;
  role: string;
  roleLabel: string;
  schoolName: string | null;
  cohortName: string | null;
};

export function buildDashboardUserContext(
  profile: DashboardProfileRow,
  fallbackEmail: string,
): DashboardUserContext {
  const role = profile.role ?? "participant";

  return {
    displayName: getDisplayName(profile.full_name, fallbackEmail),
    email: profile.email ?? fallbackEmail,
    role,
    roleLabel: getRoleLabel(role),
    schoolName: getSchoolDisplayName(profile),
    cohortName: getCohortDisplayName(profile.cohorts ?? null),
  };
}

export function buildDashboardProfileFields(
  user: DashboardUserContext,
  options: { includeSchoolCohort?: boolean } = {},
): DashboardProfileField[] {
  const fields: DashboardProfileField[] = [
    { label: "Name", value: user.displayName },
    { label: "Email", value: user.email },
    { label: "Role", value: user.roleLabel },
  ];

  if (options.includeSchoolCohort) {
    if (user.schoolName) {
      fields.push({ label: "School", value: user.schoolName });
    }
    if (user.cohortName) {
      fields.push({ label: "Class", value: user.cohortName });
    }
  }

  return fields;
}
