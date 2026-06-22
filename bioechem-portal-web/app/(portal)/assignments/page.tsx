import { PortalComingSoon } from "@/components/portal/portal-page";
import {
  createGatedPageMetadata,
  GatedPortalPage,
} from "@/components/portal/gated-portal-page";

export const metadata = createGatedPageMetadata("Assignments");

export default function AssignmentsPage() {
  return (
    <GatedPortalPage
      title="Assignments"
      description="View due dates, submit work, and track grades."
      featureName="Assignments"
    >
      <PortalComingSoon feature="Assignments" />
    </GatedPortalPage>
  );
}
