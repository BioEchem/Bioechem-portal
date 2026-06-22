import { PortalComingSoon } from "@/components/portal/portal-page";
import {
  createGatedPageMetadata,
  GatedPortalPage,
} from "@/components/portal/gated-portal-page";

export const metadata = createGatedPageMetadata("Messaging");

export default function MessagingPage() {
  return (
    <GatedPortalPage
      title="Messaging"
      description="Send and receive messages with teachers, students, and staff."
      featureName="Messaging"
    >
      <PortalComingSoon feature="Messaging" />
    </GatedPortalPage>
  );
}
