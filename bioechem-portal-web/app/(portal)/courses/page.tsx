import { PortalComingSoon } from "@/components/portal/portal-page";
import {
  createGatedPageMetadata,
  GatedPortalPage,
} from "@/components/portal/gated-portal-page";

export const metadata = createGatedPageMetadata("Courses");

export default function CoursesPage() {
  return (
    <GatedPortalPage
      title="Courses"
      description="Course modules and materials for your school."
      featureName="Courses"
    >
      <PortalComingSoon feature="Courses" />
    </GatedPortalPage>
  );
}
