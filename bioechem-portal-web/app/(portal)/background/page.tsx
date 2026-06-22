import type { Metadata } from "next";

import { ProfileBackgroundSection } from "@/components/profile/profile-background-section";
import { PortalPage } from "@/components/portal/portal-page";
import { requireSession } from "@/lib/auth/session";
import { parseEducationEntries } from "@/lib/profile/education";
import type { ProfileSummaryData } from "@/lib/profile/types";
import { parseWorkEntries } from "@/lib/profile/work";
import { PORTAL_PROFILE_SELECT } from "@/lib/portal/profile-select";

export const metadata: Metadata = {
  title: "Background",
};

export default async function BackgroundPage() {
  const { profile } = await requireSession<ProfileSummaryData>({
    requireApproved: true,
    profileSelect: PORTAL_PROFILE_SELECT,
  });

  return (
    <PortalPage
      title="Background"
      description="Your education, work history, and volunteer experience."
    >
      <ProfileBackgroundSection
        initialEducation={parseEducationEntries(profile.education_background)}
        initialWorkHistory={parseWorkEntries(profile.work_experience)}
      />
    </PortalPage>
  );
}
