import type { Metadata } from "next";

import { PortalComingSoon, PortalPage } from "@/components/portal/portal-page";

type ComingSoonPageProps = {
  title: string;
  description: string;
  feature: string;
};

export function createComingSoonMetadata(title: string): Metadata {
  return { title };
}

export function ComingSoonPage({ title, description, feature }: ComingSoonPageProps) {
  return (
    <PortalPage title={title} description={description}>
      <PortalComingSoon feature={feature} />
    </PortalPage>
  );
}
