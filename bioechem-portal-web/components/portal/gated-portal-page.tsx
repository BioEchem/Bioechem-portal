import type { Metadata } from "next";

import { PortalPage } from "@/components/portal/portal-page";
import { ProfileCompletionPrompt } from "@/components/profile/profile-completion-prompt";
import {
  loadPortalProfileCompletion,
  participantNeedsMinimumProfile,
} from "@/lib/portal/profile-guard";

type GatedPortalPageProps = {
  title: string;
  description: string;
  featureName: string;
  children: React.ReactNode;
};

export function createGatedPageMetadata(title: string): Metadata {
  return { title };
}

export async function GatedPortalPage({
  title,
  description,
  featureName,
  children,
}: GatedPortalPageProps) {
  const { profile, profileCompletion } = await loadPortalProfileCompletion();

  if (participantNeedsMinimumProfile(profile.role, profileCompletion)) {
    return (
      <PortalPage title={title} description={description}>
        <ProfileCompletionPrompt
          variant="gate"
          status={profileCompletion}
          featureName={featureName}
        />
      </PortalPage>
    );
  }

  return (
    <PortalPage title={title} description={description}>
      {children}
    </PortalPage>
  );
}
