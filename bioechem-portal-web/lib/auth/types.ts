/** JSON shapes for `/api/auth/*` routes. */

export type AuthApiError = {
  error: {
    message: string;
    code?: "email_exists";
  };
};

export type LoginRequestBody = {
  email: string;
  password: string;
};

export type LoginSuccessResponse = {
  ok: true;
  redirectTo: string;
};

export type SignupRole =
  | "participant"
  | "teacher"
  | "school_admin"
  | "industry_partner"
  | "shareholder"
  | "bioechem_admin";

export type PartnerType = "industry" | "government";

export type SignupRequestBody = {
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

export type SignupSuccessResponse = {
  ok: true;
  redirectTo: string;
};

import type { CohortOption, SchoolOption } from "@/lib/schools/types";

export type SignupSchoolOption = SchoolOption;
export type SignupCohortOption = CohortOption;

export type SignupSchoolsResponse = {
  schools: SchoolOption[];
  cohorts: CohortOption[];
};

export type LogoutSuccessResponse = {
  ok: true;
  redirectTo: string;
};

export type PasswordChangeRequestBody = {
  currentPassword: string;
  newPassword: string;
};

export type PasswordChangeSuccessResponse = {
  ok: true;
};

export type ForgotPasswordRequestBody = {
  email: string;
};

export type ForgotPasswordSuccessResponse = {
  ok: true;
};

export type ResetPasswordRequestBody = {
  password: string;
};

export type ResetPasswordSuccessResponse = {
  ok: true;
};
