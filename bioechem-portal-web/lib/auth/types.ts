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

export type SignupRequestBody = {
  email: string;
  password: string;
  fullName: string;
  role: SignupRole;
  schoolId?: string | null;
  otherSchoolName?: string | null;
  cohortId?: string | null;
  age?: number | null;
};

export type SignupSuccessResponse = {
  ok: true;
  redirectTo: string;
};

export type SignupSchoolOption = {
  id: string;
  name: string;
};

export type SignupCohortOption = {
  id: string;
  schoolId: string;
  name: string;
};

export type SignupSchoolsResponse = {
  schools: SignupSchoolOption[];
  cohorts: SignupCohortOption[];
};

export type LogoutSuccessResponse = {
  ok: true;
  redirectTo: string;
};
