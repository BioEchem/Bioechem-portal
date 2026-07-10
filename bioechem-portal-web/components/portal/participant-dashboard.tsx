import { Clock } from "lucide-react";

import {
  DashboardPlaceholderGrid,
  DashboardQuickLinks,
  DashboardShell,
} from "@/components/portal/dashboard-ui";
import { PortalCard } from "@/components/portal/portal-page";
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
  pendingCohortNames?: string[];
};

export function ParticipantDashboard({
  user,
  profileCompletion,
  pendingCohortNames = [],
}: ParticipantDashboardProps) {
  const { welcomeSubtitle } = getRoleConfig(user.role);

  return (
    <DashboardShell
      user={user}
      subtitle={welcomeSubtitle}
      profileFields={buildDashboardProfileFields(user, { includeSchoolCohort: true })}
    >
      <ProfileCompletionPrompt variant="dashboard" status={profileCompletion} />
      {pendingCohortNames.length > 0 ? (
        <PortalCard className="border-amber-300 bg-amber-50 shadow-none">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                {pendingCohortNames.length === 1
                  ? `Your request to join "${pendingCohortNames[0]}" is pending approval`
                  : "Your class enrollment requests are pending approval"}
              </p>
              <p className="mt-1 text-sm text-amber-900">
                {pendingCohortNames.length > 1
                  ? `Waiting on approval for: ${pendingCohortNames.join(", ")}. `
                  : ""}
                An admin will review your request. You&apos;ll get access to course
                materials once it&apos;s approved.
              </p>
            </div>
          </div>
        </PortalCard>
      ) : null}
      <DashboardQuickLinks
        links={[
          {
            label: "My courses",
            href: PORTAL_ROUTES.cohorts,
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
