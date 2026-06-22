import type { Metadata } from "next";

import { ProfileAvatarSection } from "@/components/profile/profile-avatar-section";
import { ProfileCompletionPrompt } from "@/components/profile/profile-completion-prompt";
import { ProfileEmergencyContactsSection } from "@/components/profile/profile-emergency-contacts-section";
import { ProfilePasswordSection } from "@/components/profile/profile-password-section";
import { ProfilePersonalSection } from "@/components/profile/profile-personal-section";
import { ProfileResumeSection } from "@/components/profile/profile-resume-section";
import { ProfileSchoolSection } from "@/components/profile/profile-school-section";
import { PortalPage } from "@/components/portal/portal-page";
import { roleRequiresPartnerSchool } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { profileRowToAddress } from "@/lib/profile/address";
import { getProfileCompletionStatus } from "@/lib/profile/completion";
import { parseEmergencyContacts } from "@/lib/profile/emergency-contacts";
import {
  getCohortDisplayName,
  getSchoolDisplayName,
} from "@/lib/profile/display";
import { splitFullName } from "@/lib/profile/name";
import type { CohortOption, ProfileSummaryData, SchoolOption } from "@/lib/profile/types";
import {
  PORTAL_COHORTS_SELECT,
  PORTAL_PROFILE_SELECT,
  PORTAL_SCHOOLS_SELECT,
} from "@/lib/portal/profile-select";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function AccountPage() {
  const { supabase, user, profile } = await requireSession<ProfileSummaryData>({
    requireApproved: true,
    profileSelect: PORTAL_PROFILE_SELECT,
  });

  const role = profile.role ?? "";
  const profileCompletion =
    role === "participant" ? getProfileCompletionStatus(profile) : null;
  const splitName = splitFullName(profile.full_name);
  const firstName = profile.first_name?.trim() || splitName.firstName;
  const lastName =
    profile.last_name?.trim() ||
    (splitName.lastName === "—" ? "" : splitName.lastName);

  let schools: SchoolOption[] = [];
  let cohorts: CohortOption[] = [];

  const showResume = role === "participant" || role === "teacher";

  const resumeHistoryQuery = showResume
    ? supabase
        .from("user_resumes")
        .select("id, url, filename, uploaded_at")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false })
    : Promise.resolve({ data: null });

  const fetchExtras = roleRequiresPartnerSchool(role)
    ? Promise.all([
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
        resumeHistoryQuery,
      ])
    : Promise.all([
        Promise.resolve({ data: null }),
        Promise.resolve({ data: null }),
        resumeHistoryQuery,
      ]);

  const [schoolResult, cohortResult, resumeResult] = await fetchExtras;

  if (schoolResult.data) {
    schools = schoolResult.data.map((s) => ({ id: s.id, name: s.name }));
  }
  if (cohortResult.data) {
    cohorts = cohortResult.data.map((c) => ({
      id: c.id,
      schoolId: c.school_id,
      name: c.name,
    }));
  }

  const resumeHistory = (resumeResult.data ?? []) as {
    id: string;
    url: string;
    filename: string | null;
    uploaded_at: string;
  }[];

  return (
    <PortalPage
      title="Profile"
      description={showResume ? "Manage your account, personal details, background, and resume." : "Manage your account and personal details."}
    >
      <div className="space-y-4">
        {profileCompletion ? (
          <ProfileCompletionPrompt variant="profile" status={profileCompletion} />
        ) : null}

        <ProfileAvatarSection
          userId={user.id}
          currentAvatarUrl={profile.avatar_url ?? null}
          fullName={profile.full_name}
          email={profile.email}
        />

        <ProfilePersonalSection
          role={role}
          initialFirstName={firstName === "—" ? "" : firstName}
          initialLastName={lastName}
          initialMiddleName={profile.middle_name?.trim() ?? ""}
          initialAge={profile.age}
          initialAddress={profileRowToAddress(profile)}
          initialPhone={profile.phone?.trim() ?? ""}
          initialGender={profile.gender?.trim() ?? ""}
        />

        {roleRequiresPartnerSchool(role) ? (
          <>
            <ProfileSchoolSection
              role={role}
              initialSchoolId={profile.school_id}
              initialOtherSchoolName={profile.other_school_name}
              initialCohortId={profile.cohort_id}
              initialState={profile.state?.trim() ?? ""}
              schoolDisplayName={getSchoolDisplayName(profile)}
              cohortDisplayName={getCohortDisplayName(profile.cohorts)}
              schools={schools}
              cohorts={cohorts}
            />
            <ProfileEmergencyContactsSection
              initialContacts={parseEmergencyContacts(profile.emergency_contacts)}
            />
          </>
        ) : null}

        {showResume ? (
          <ProfileResumeSection
            userId={user.id}
            currentResumeUrl={profile.resume_url ?? null}
            resumeHistory={resumeHistory}
          />
        ) : null}

        <ProfilePasswordSection />
      </div>
    </PortalPage>
  );
}
