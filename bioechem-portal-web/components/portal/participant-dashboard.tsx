import {
  DashboardPlaceholderGrid,
  DashboardQuickLinks,
  DashboardShell,
} from "@/components/portal/dashboard-ui";
import { ProfileCompletionPrompt } from "@/components/profile/profile-completion-prompt";
import {
  buildDashboardProfileFields,
  type DashboardUserContext,
} from "@/lib/dashboard/types";
import type { ProfileCompletionStatus } from "@/lib/profile/completion";
import { getRoleConfig } from "@/lib/portal/role-config";
import { PORTAL_ROUTES } from "@/lib/portal/routes";

type ParticipantDashboardProps = {
  user: DashboardUserContext;
  profileCompletion: ProfileCompletionStatus;
};

export function ParticipantDashboard({
  user,
  profileCompletion,
}: ParticipantDashboardProps) {
  const { welcomeSubtitle } = getRoleConfig(user.role);

  return (
    <DashboardShell
      user={user}
      subtitle={welcomeSubtitle}
      profileFields={buildDashboardProfileFields(user, { includeSchoolCohort: true })}
    >
      <ProfileCompletionPrompt variant="dashboard" status={profileCompletion} />
      <DashboardQuickLinks
        links={[
          {
            label: "My courses",
            href: PORTAL_ROUTES.courses,
            description: "View enrolled BioEchem courses and lesson materials.",
          },
          {
            label: "Assignments",
            href: PORTAL_ROUTES.assignments,
            description: "See upcoming tasks and submit your work.",
          },
          {
            label: "Messaging",
            href: PORTAL_ROUTES.messaging,
            description: "Message teachers and classmates.",
          },
        ]}
      />
      <DashboardPlaceholderGrid
        items={[
          {
            title: "My courses",
            description:
              "You are not enrolled in any courses yet. Enrolled courses and recent activity will appear here.",
          },
          {
            title: "Grades & progress",
            description:
              "Your grades and assignment feedback will show here once grading is enabled.",
          },
        ]}
      />
    </DashboardShell>
  );
}
