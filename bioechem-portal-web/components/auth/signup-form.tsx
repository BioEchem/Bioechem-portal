"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  authErrorMessageClassName,
  authInputClassName,
  authLabelClassName,
  authSubmitButtonClassName,
  authWarningMessageClassName,
} from "@/components/auth/form-styles";
import {
  isSignupRole,
  roleAllowsCohortOnSignup,
  roleRequiresPartnerSchool,
} from "@/lib/auth/roles";
import type { SignupRole } from "@/lib/auth/types";
import type {
  AuthApiError,
  SignupCohortOption,
  SignupSchoolOption,
  SignupSchoolsResponse,
  SignupSuccessResponse,
} from "@/lib/auth/types";

const OTHER_SCHOOL_VALUE = "other";

export function SignupForm() {
  const router = useRouter();
  const [schools, setSchools] = useState<SignupSchoolOption[]>([]);
  const [cohorts, setCohorts] = useState<SignupCohortOption[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [role, setRole] = useState<SignupRole | "">("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailExists, setEmailExists] = useState(false);
  const [pending, setPending] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(true);

  const needsPartnerSchool = role !== "" && roleRequiresPartnerSchool(role);
  const showsCohort = role !== "" && roleAllowsCohortOnSignup(role);
  const isParticipant = role === "participant";
  const isOtherSchool = schoolId === OTHER_SCHOOL_VALUE;
  const isBioechemAdmin = role === "bioechem_admin";
  const isPartnerOrShareholder =
    role === "industry_partner" || role === "shareholder";

  function handleRoleChange(nextRole: string) {
    const value = nextRole as SignupRole | "";
    setRole(value);
    if (!value || !roleRequiresPartnerSchool(value)) {
      setSchoolId("");
    }
  }

  const cohortsForSchool = useMemo(
    () => cohorts.filter((c) => c.schoolId === schoolId),
    [cohorts, schoolId],
  );

  useEffect(() => {
    async function loadSchools() {
      try {
        const response = await fetch("/api/auth/signup/schools");
        const data = (await response.json()) as
          | SignupSchoolsResponse
          | AuthApiError;

        if (!response.ok || !("schools" in data)) {
          setLoadError(
            "error" in data
              ? data.error.message
              : "Could not load partner schools.",
          );
          return;
        }

        setSchools(data.schools);
        setCohorts(data.cohorts);
      } catch {
        setLoadError("Network error loading schools.");
      } finally {
        setLoadingSchools(false);
      }
    }

    loadSchools();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setEmailExists(false);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));
    const confirmPassword = String(formData.get("confirmPassword"));
    const selectedRole = String(formData.get("role"));

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setPending(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }

    if (!isSignupRole(selectedRole)) {
      setError("Please select your role.");
      setPending(false);
      return;
    }

    if (roleRequiresPartnerSchool(selectedRole)) {
      const selectedSchool = String(formData.get("schoolId") ?? "");
      const otherSchoolName = String(formData.get("otherSchoolName") ?? "").trim();

      if (!selectedSchool) {
        setError("Please select your partner school.");
        setPending(false);
        return;
      }

      if (selectedSchool === OTHER_SCHOOL_VALUE && !otherSchoolName) {
        setError("Please enter your school name.");
        setPending(false);
        return;
      }
    }

    const age =
      selectedRole === "participant"
        ? Number.parseInt(String(formData.get("age")), 10)
        : null;

    if (selectedRole === "participant" && (!age || Number.isNaN(age))) {
      setError("Age is required for participants.");
      setPending(false);
      return;
    }

    const email = String(formData.get("email")).trim();
    const fullName = String(formData.get("fullName")).trim();

    if (!fullName) {
      setError("Full name is required.");
      setPending(false);
      return;
    }

    if (!email) {
      setError("Email is required.");
      setPending(false);
      return;
    }

    const cohortId = String(formData.get("cohortId") ?? "");
    const selectedSchool = String(formData.get("schoolId") ?? "");
    const otherSchoolName = String(formData.get("otherSchoolName") ?? "").trim();
    const usingOtherSchool = selectedSchool === OTHER_SCHOOL_VALUE;

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          role: selectedRole,
          schoolId:
            roleRequiresPartnerSchool(selectedRole) && !usingOtherSchool
              ? selectedSchool
              : null,
          otherSchoolName:
            roleRequiresPartnerSchool(selectedRole) && usingOtherSchool
              ? otherSchoolName
              : null,
          cohortId:
            roleAllowsCohortOnSignup(selectedRole) && !usingOtherSchool
              ? cohortId || null
              : null,
          age: selectedRole === "participant" ? age : null,
        }),
      });

      const data = (await response.json()) as SignupSuccessResponse | AuthApiError;

      if (!response.ok || !("ok" in data)) {
        if ("error" in data && data.error.code === "email_exists") {
          setEmailExists(true);
          setError(null);
          return;
        }
        setError("error" in data ? data.error.message : "Could not create account.");
        return;
      }

      router.push(data.redirectTo);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (loadingSchools) {
    return (
      <p className="text-center text-sm text-bio-text-muted">Loading form…</p>
    );
  }

  const showLoadWarning = Boolean(loadError && needsPartnerSchool);

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="signup-full-name" className={authLabelClassName}>
          Full name
        </label>
        <input
          id="signup-full-name"
          name="fullName"
          type="text"
          autoComplete="name"
          disabled={pending}
          className={authInputClassName}
        />
      </div>

      <div>
        <label htmlFor="signup-email" className={authLabelClassName}>
          Email
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          disabled={pending}
          placeholder={
            isBioechemAdmin
              ? "name@bioechem.com"
              : isPartnerOrShareholder
                ? "you@company.com"
                : needsPartnerSchool
                  ? "name@school.edu"
                  : "name@email.com"
          }
          className={authInputClassName}
        />
      </div>

      <div>
        <label htmlFor="signup-role" className={authLabelClassName}>
          I am a
        </label>
        <select
          id="signup-role"
          name="role"
          disabled={pending}
          value={role}
          onChange={(e) => handleRoleChange(e.target.value)}
          className={authInputClassName}
        >
          <option value="" disabled>
            Select your role
          </option>
          <option value="participant">Participant</option>
          <option value="teacher">Teacher</option>
          <option value="school_admin">School admin</option>
          <option value="industry_partner">Partner</option>
          <option value="shareholder">Shareholder</option>
          <option value="bioechem_admin">BioEchem admin</option>
        </select>
      </div>

      {needsPartnerSchool ? (
        <>
          <div>
            <label htmlFor="signup-school" className={authLabelClassName}>
              Partner school
            </label>
            <select
              id="signup-school"
              name="schoolId"
              disabled={pending}
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className={authInputClassName}
            >
              <option value="" disabled>
                Select your school
              </option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
              <option value={OTHER_SCHOOL_VALUE}>Other</option>
            </select>
          </div>

          {isOtherSchool ? (
            <div>
              <label htmlFor="signup-other-school" className={authLabelClassName}>
                School name
              </label>
              <input
                id="signup-other-school"
                name="otherSchoolName"
                type="text"
                disabled={pending}
                placeholder="Enter your school name"
                className={authInputClassName}
              />
            </div>
          ) : null}

          {showsCohort && !isOtherSchool && cohortsForSchool.length > 0 ? (
            <div>
              <label htmlFor="signup-cohort" className={authLabelClassName}>
                Cohort{" "}
                <span className="font-normal text-bio-text-muted">(optional)</span>
              </label>
              <select
                id="signup-cohort"
                name="cohortId"
                disabled={pending}
                defaultValue=""
                className={authInputClassName}
              >
                <option value="">None</option>
                {cohortsForSchool.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {isParticipant ? (
            <div>
              <label htmlFor="signup-age" className={authLabelClassName}>
                Age
              </label>
              <input
                id="signup-age"
                name="age"
                type="number"
                inputMode="numeric"
                min={1}
                disabled={pending}
                className={authInputClassName}
              />
            </div>
          ) : null}
        </>
      ) : null}

      <div>
        <label htmlFor="signup-password" className={authLabelClassName}>
          Password
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          disabled={pending}
          className={authInputClassName}
        />
      </div>

      <div>
        <label htmlFor="signup-confirm-password" className={authLabelClassName}>
          Confirm password
        </label>
        <input
          id="signup-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          disabled={pending}
          className={authInputClassName}
        />
      </div>

      <button
        type="submit"
        className={authSubmitButtonClassName}
        disabled={pending}
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <div className="space-y-2">
        {error ? (
          <p className={authErrorMessageClassName} role="alert">
            {error}
          </p>
        ) : null}

        {showLoadWarning ? (
          <p className={authWarningMessageClassName} role="status">
            {loadError} Try again, or choose Partner, Shareholder, or BioEchem
            Admin if you are not at a partner school.
          </p>
        ) : null}

        {emailExists ? (
          <p className={authErrorMessageClassName} role="alert">
            Email already exists.
          </p>
        ) : null}
      </div>
    </form>
  );
}
