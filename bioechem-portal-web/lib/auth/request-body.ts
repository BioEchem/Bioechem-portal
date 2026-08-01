import { isSignupRole } from "@/lib/auth/roles";
import type {
  LoginRequestBody,
  PasswordChangeRequestBody,
  SignupRequestBody,
  SignupRole,
} from "@/lib/auth/types";

export function parseLoginBody(body: unknown): LoginRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") return null;
  return { email: email.trim(), password };
}

export function parseSignupBody(body: unknown): SignupRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const email = typeof record.email === "string" ? record.email.trim() : "";
  const password = typeof record.password === "string" ? record.password : "";
  const firstName =
    typeof record.firstName === "string" ? record.firstName.trim() : "";
  const lastName =
    typeof record.lastName === "string" ? record.lastName.trim() : "";
  const role = record.role;
  const schoolId =
    typeof record.schoolId === "string" ? record.schoolId.trim() : "";
  const otherSchoolName =
    typeof record.otherSchoolName === "string"
      ? record.otherSchoolName.trim()
      : "";
  const cohortId =
    record.cohortId === null || record.cohortId === undefined
      ? null
      : typeof record.cohortId === "string"
        ? record.cohortId.trim() || null
        : null;
  const age =
    typeof record.age === "number"
      ? record.age
      : typeof record.age === "string" && record.age.trim()
        ? Number.parseInt(record.age.trim(), 10)
        : null;
  const partnerType =
    record.partnerType === "industry" || record.partnerType === "government"
      ? record.partnerType
      : null;

  if (!isSignupRole(String(role))) return null;

  return {
    email,
    password,
    firstName,
    lastName,
    role: role as SignupRole,
    schoolId: schoolId || null,
    otherSchoolName: otherSchoolName || null,
    cohortId,
    age: Number.isNaN(age) ? null : age,
    partnerType,
  };
}

export function parsePasswordChangeBody(body: unknown): PasswordChangeRequestBody | null {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const currentPassword =
    typeof record.currentPassword === "string" ? record.currentPassword : "";
  const newPassword = typeof record.newPassword === "string" ? record.newPassword : "";

  if (!currentPassword || !newPassword) return null;

  return { currentPassword, newPassword };
}
