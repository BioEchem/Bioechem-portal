"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  authInputClassName,
  authLabelClassName,
} from "@/components/auth/form-styles";
import { ProfileEditPanel } from "@/components/profile/profile-edit-panel";
import { ProfileFieldGrid } from "@/components/profile/profile-field-grid";
import { ProfileFormFeedback } from "@/components/profile/profile-form-feedback";
import {
  ProfileEditButton,
  ProfileSection,
} from "@/components/profile/profile-section";
import type { AuthApiError } from "@/lib/auth/types";
import { roleAllowsCohortOnSignup } from "@/lib/auth/roles";
import type {
  CohortOption,
  SchoolOption,
  UpdateProfileSuccessResponse,
} from "@/lib/profile/types";

type ProfileSchoolSectionProps = {
  role: string;
  initialSchoolId: string | null;
  initialOtherSchoolName: string | null;
  initialCohortId: string | null;
  initialState: string;
  schoolDisplayName: string | null;
  cohortDisplayName: string | null;
  schools: SchoolOption[];
  cohorts: CohortOption[];
};

export function ProfileSchoolSection({
  role,
  initialSchoolId,
  initialOtherSchoolName,
  initialCohortId,
  initialState,
  schoolDisplayName,
  cohortDisplayName,
  schools,
  cohorts,
}: ProfileSchoolSectionProps) {
  const router = useRouter();
  const usesOtherSchool = Boolean(initialOtherSchoolName?.trim());
  const [editing, setEditing] = useState(false);
  const [schoolId, setSchoolId] = useState(initialSchoolId ?? "");
  const [otherSchoolName, setOtherSchoolName] = useState(initialOtherSchoolName ?? "");
  const [cohortId, setCohortId] = useState(initialCohortId ?? "");
  const [state, setState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isParticipant = role === "participant";
  const showClass = roleAllowsCohortOnSignup(role);

  const cohortOptions = useMemo(
    () => cohorts.filter((cohort) => cohort.schoolId === schoolId),
    [cohorts, schoolId],
  );

  function resetForm() {
    setSchoolId(initialSchoolId ?? "");
    setOtherSchoolName(initialOtherSchoolName ?? "");
    setCohortId(initialCohortId ?? "");
    setState(initialState);
    setError(null);
  }

  function openEdit() {
    resetForm();
    setEditing(true);
  }

  function closeEdit() {
    if (pending) return;
    resetForm();
    setEditing(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isParticipant && !state.trim()) {
      setError("State is required for participants.");
      return;
    }

    setPending(true);

    const payload = usesOtherSchool
      ? {
          section: "school" as const,
          otherSchoolName: otherSchoolName.trim() || null,
          state: state.trim() || null,
        }
      : {
          section: "school" as const,
          schoolId: schoolId || null,
          cohortId: showClass && cohortId ? cohortId : null,
          state: state.trim() || null,
        };

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as
        | UpdateProfileSuccessResponse
        | AuthApiError;

      if (!response.ok || !("ok" in data)) {
        setError("error" in data ? data.error.message : "Could not save school details.");
        return;
      }

      setEditing(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const viewFields = [
    { label: "School", value: schoolDisplayName, fullWidth: true },
    ...(showClass
      ? [{ label: "Class / cohort", value: cohortDisplayName }]
      : []),
    { label: "State", value: initialState },
  ];

  return (
    <>
      <ProfileSection
        title="School"
        description="Your school affiliation, class, and emergency contacts."
        action={<ProfileEditButton onClick={openEdit} />}
      >
        <ProfileFieldGrid fields={viewFields} />
      </ProfileSection>

      <ProfileEditPanel
        title="school details"
        open={editing}
        pending={pending}
        onClose={closeEdit}
        onSubmit={handleSubmit}
        feedback={<ProfileFormFeedback error={error} success={null} />}
      >
        {usesOtherSchool ? (
          <div>
            <label htmlFor="profile-other-school" className={authLabelClassName}>
              School name
            </label>
            <input
              id="profile-other-school"
              type="text"
              disabled={pending}
              value={otherSchoolName}
              onChange={(event) => setOtherSchoolName(event.target.value)}
              className={authInputClassName}
            />
            <p className="mt-1 text-xs text-bio-text-muted">
              You registered with a school not listed as a partner.
            </p>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="profile-school" className={authLabelClassName}>
                School
              </label>
              <select
                id="profile-school"
                disabled={pending}
                value={schoolId}
                onChange={(event) => {
                  setSchoolId(event.target.value);
                  setCohortId("");
                }}
                className={authInputClassName}
              >
                <option value="">Select a school</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>

            {showClass ? (
              <div>
                <label htmlFor="profile-class" className={authLabelClassName}>
                  Class / cohort
                </label>
                <select
                  id="profile-class"
                  disabled={pending || !schoolId}
                  value={cohortId}
                  onChange={(event) => setCohortId(event.target.value)}
                  className={authInputClassName}
                >
                  <option value="">Select a class</option>
                  {cohortOptions.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </>
        )}

        <div>
          <label htmlFor="profile-state" className={authLabelClassName}>
            State{isParticipant ? " *" : ""}
          </label>
          <input
            id="profile-state"
            type="text"
            autoComplete="address-level1"
            required={isParticipant}
            disabled={pending}
            value={state}
            onChange={(event) => setState(event.target.value)}
            className={authInputClassName}
          />
        </div>

      </ProfileEditPanel>
    </>
  );
}
