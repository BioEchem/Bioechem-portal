import type { SignupRole } from "@/lib/auth/types";

export const SIGNUP_ROLES: SignupRole[] = [
  "participant",
  "teacher",
  "school_admin",
  "industry_partner",
  "shareholder",
  "bioechem_admin",
];

/** Roles that must pick a partner school on signup. */
export const ROLES_REQUIRING_PARTNER_SCHOOL: SignupRole[] = [
  "participant",
  "teacher",
  "school_admin",
];

/** Participant/teacher only — school admins are not tied to a cohort. */
export const ROLES_WITH_COHORT_ON_SIGNUP: SignupRole[] = ["participant", "teacher"];

export function isSignupRole(role: string): role is SignupRole {
  return SIGNUP_ROLES.includes(role as SignupRole);
}

export function roleRequiresPartnerSchool(
  role: string,
): role is (typeof ROLES_REQUIRING_PARTNER_SCHOOL)[number] {
  return ROLES_REQUIRING_PARTNER_SCHOOL.includes(role as SignupRole);
}

export function roleAllowsCohortOnSignup(
  role: string,
): role is (typeof ROLES_WITH_COHORT_ON_SIGNUP)[number] {
  return ROLES_WITH_COHORT_ON_SIGNUP.includes(role as SignupRole);
}
