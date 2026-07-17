import {
  roleAllowsCohortOnSignup,
  roleRequiresPartnerSchool,
} from "@/lib/auth/roles";
import type { PartnerType, SignupRole } from "@/lib/auth/types";
import { isEmailAlreadyRegistered } from "@/lib/auth/check-email";
import { buildFullName } from "@/lib/profile/name";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type SignUpResult =
  | { ok: true }
  | { ok: false; message: string; code?: "email_exists" };

export type SignUpInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: SignupRole;
  schoolId?: string | null;
  otherSchoolName?: string | null;
  cohortId?: string | null;
  age?: number | null;
  partnerType?: PartnerType | null;
};

type ValidatedSignUpInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: SignupRole;
  schoolId: string | null;
  otherSchoolName: string | null;
  cohortId: string | null;
  age: number | null;
  partnerType: PartnerType | null;
};

export const EMAIL_EXISTS_MESSAGE =
  "Email already exists. Please log in or sign up with a different email.";

const MIN_PASSWORD_LENGTH = 6;

function signUpFailure(message: string, code?: "email_exists"): SignUpResult {
  return { ok: false, message, ...(code ? { code } : {}) };
}

/** Validates and normalizes signup input — single source of truth for rules. */
export function validateSignUpInput(input: SignUpInput): SignUpResult | ValidatedSignUpInput {
  const email = input.email.trim();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const schoolId = input.schoolId?.trim() || null;
  const otherSchoolName = input.otherSchoolName?.trim() || null;
  const cohortId = input.cohortId?.trim() || null;

  if (!email || !input.password || !firstName || !lastName) {
    return signUpFailure("Email, password, first name, and last name are required.");
  }

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return signUpFailure("Password must be at least 6 characters.");
  }

  if (roleRequiresPartnerSchool(input.role) && !schoolId && !otherSchoolName) {
    return signUpFailure(
      "Partner school is required for participants, teachers, and school admins.",
    );
  }

  if (schoolId && otherSchoolName) {
    return signUpFailure("Choose a listed school or enter another school name.");
  }

  if (input.role === "participant" && (input.age == null || input.age < 1)) {
    return signUpFailure("Age is required for participants.");
  }

  if (input.role === "industry_partner" && !input.partnerType) {
    return signUpFailure("Partner type is required for industry partners.");
  }

  return {
    email,
    password: input.password,
    firstName,
    lastName,
    fullName: buildFullName(firstName, null, lastName),
    role: input.role,
    schoolId,
    otherSchoolName,
    cohortId: roleAllowsCohortOnSignup(input.role) ? cohortId : null,
    age: input.role === "participant" ? (input.age ?? null) : null,
    partnerType: input.role === "industry_partner" ? (input.partnerType ?? null) : null,
  };
}

function isDuplicateEmailError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already registered") ||
    lower.includes("already exists") ||
    lower.includes("already been registered") ||
    lower.includes("user already")
  );
}

/** Creates auth user + profile (via DB trigger) and establishes session cookies. */
export async function signUpWithEmail(input: SignUpInput): Promise<SignUpResult> {
  const validated = validateSignUpInput(input);
  if ("ok" in validated) {
    return validated;
  }

  if (await isEmailAlreadyRegistered(validated.email)) {
    return signUpFailure(EMAIL_EXISTS_MESSAGE, "email_exists");
  }

  const supabase = await createClient();
  const includeSchool = roleRequiresPartnerSchool(validated.role);
  const includeCohort = roleAllowsCohortOnSignup(validated.role);

  const { data, error } = await supabase.auth.signUp({
    email: validated.email,
    password: validated.password,
    options: {
      data: {
        first_name: validated.firstName,
        last_name: validated.lastName,
        full_name: validated.fullName,
        role: validated.role,
        school_id: includeSchool && validated.schoolId ? validated.schoolId : "",
        other_school_name:
          includeSchool && validated.otherSchoolName
            ? validated.otherSchoolName
            : "",
        cohort_id: includeCohort && validated.cohortId ? validated.cohortId : "",
        age:
          validated.role === "participant" && validated.age != null
            ? String(validated.age)
            : "",
      },
    },
  });

  if (error) {
    if (isDuplicateEmailError(error.message)) {
      return signUpFailure(EMAIL_EXISTS_MESSAGE, "email_exists");
    }
    return signUpFailure(error.message);
  }

  if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
    await supabase.auth.signOut();
    return signUpFailure(EMAIL_EXISTS_MESSAGE, "email_exists");
  }

  if (!data.user) {
    return signUpFailure("Could not create account. Please try again.");
  }

  // The DB trigger that creates the profiles row doesn't know about
  // partner_type — set it here as a follow-up update. Uses the service
  // role since a session may not be active yet at this point.
  if (validated.role === "industry_partner" && validated.partnerType) {
    const admin = createServiceRoleClient();
    await admin
      ?.from("profiles")
      .update({ partner_type: validated.partnerType })
      .eq("id", data.user.id);
  }

  return { ok: true };
}
