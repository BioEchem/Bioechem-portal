import type { Metadata } from "next";

import { SiteHeader } from "@/components/brand/site-header";
import { ProfileOnboardingForm } from "@/components/profile/profile-onboarding-form";
import { roleRequiresPartnerSchool } from "@/lib/auth/roles";
import { requireCompleteProfileSession } from "@/lib/auth/session";
import { profileRowToAddress } from "@/lib/profile/address";
import { parseEducationEntries } from "@/lib/profile/education";
import { parseEmergencyContacts } from "@/lib/profile/emergency-contacts";
import { getOnboardingStatus } from "@/lib/profile/onboarding";
import { splitFullName } from "@/lib/profile/name";
import type { CohortOption, ProfileSummaryData, SchoolOption } from "@/lib/profile/types";
import { parseWorkEntries } from "@/lib/profile/work";
import {
  PORTAL_COHORTS_SELECT,
  PORTAL_PROFILE_SELECT,
  PORTAL_SCHOOLS_SELECT,
} from "@/lib/portal/profile-select";

export const metadata: Metadata = {
  title: "Complete your profile",
};

export default async function CompleteProfilePage() {
  const { supabase, user, profile } = await requireCompleteProfileSession<ProfileSummaryData>({
    profileSelect: PORTAL_PROFILE_SELECT,
  });

  const role = profile.role ?? "";
  const onboarding = getOnboardingStatus(profile);
  const splitName = splitFullName(profile.full_name);
  const firstName = profile.first_name?.trim() || splitName.firstName;
  const lastName =
    profile.last_name?.trim() ||
    (splitName.lastName === "—" ? "" : splitName.lastName);

  let schools: SchoolOption[] = [];
  let cohorts: CohortOption[] = [];

  if (roleRequiresPartnerSchool(role)) {
    const [{ data: schoolRows }, { data: cohortRows }] = await Promise.all([
      supabase
        .from("schools")
        .select(PORTAL_SCHOOLS_SELECT)
        .eq("is_partner", true)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("cohorts")
        .select(PORTAL_COHORTS_SELECT)
        .eq("is_active", true)
        .order("name"),
    ]);

    schools = (schoolRows ?? []).map((school) => ({
      id: school.id,
      name: school.name,
    }));
    cohorts = (cohortRows ?? []).map((cohort) => ({
      id: cohort.id,
      schoolId: cohort.school_id,
      name: cohort.name,
    }));
  }

  return (
    <>
    <SiteHeader />
    <main className="bio-pattern flex flex-1 flex-col items-center px-4 py-10 sm:px-6 sm:py-12">
      <div className="w-full max-w-4xl rounded-xl border border-card-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-center text-2xl font-semibold text-bio-green">
            Complete your profile
          </h1>
          <p className="mt-2 text-center text-sm text-bio-text-muted">
            Your account is approved. Please fill in the details below before
            accessing the portal.
          </p>
          {onboarding.missingLabels.length > 0 ? (
            <p className="mt-3 text-center text-sm text-bio-text-muted">
              Still needed: {onboarding.missingLabels.join(", ")}
            </p>
          ) : null}

          <div className="mt-8">
            <ProfileOnboardingForm
              userId={user.id}
              role={role}
              initialFirstName={firstName === "—" ? "" : firstName}
              initialLastName={lastName}
              initialMiddleName={profile.middle_name?.trim() ?? ""}
              initialAge={profile.age}
              initialAddress={profileRowToAddress(profile)}
              initialPhone={profile.phone?.trim() ?? ""}
              initialGender={profile.gender?.trim() ?? ""}
              initialAvatarUrl={profile.avatar_url ?? null}
              initialBio={profile.bio?.trim() ?? ""}
              initialSchoolId={profile.school_id}
              initialOtherSchoolName={profile.other_school_name}
              initialCohortId={profile.cohort_id}
              initialState={profile.state?.trim() ?? ""}
              initialSchoolCountry={profile.school_country?.trim() ?? ""}
              initialGrade={profile.grade?.trim() ?? ""}
              initialEducation={parseEducationEntries(profile.education_background)}
              initialWorkHistory={parseWorkEntries(profile.work_experience)}
              initialResumeUrl={profile.resume_url ?? null}
              initialEmergencyContacts={parseEmergencyContacts(profile.emergency_contacts)}
              schools={schools}
              cohorts={cohorts}
            />
          </div>
        </div>
      </div>
    </main>
    </>
  );
}
