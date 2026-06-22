import {
  DashboardPlaceholderGrid,
  DashboardQuickLinks,
  DashboardShell,
} from "@/components/portal/dashboard-ui";
import {
  buildDashboardProfileFields,
  type DashboardUserContext,
} from "@/lib/dashboard/types";
import { getRoleConfig } from "@/lib/portal/role-config";
import { PORTAL_ROUTES } from "@/lib/portal/routes";

type PartnerDashboardProps = {
  user: DashboardUserContext;
};

export function PartnerDashboard({ user }: PartnerDashboardProps) {
  const { welcomeSubtitle } = getRoleConfig(user.role);

  return (
    <DashboardShell
      user={user}
      subtitle={welcomeSubtitle}
      profileFields={buildDashboardProfileFields(user)}
    >
      <DashboardQuickLinks
        links={[
          {
            label: "Messaging",
            href: PORTAL_ROUTES.messaging,
            description: "Connect with BioEchem staff and partner schools.",
          },
        ]}
      />
      <DashboardPlaceholderGrid
        items={[
          {
            title: "Partnership programs",
            description:
              "Active BioEchem partnership opportunities and your involvement will be listed here.",
          },
          {
            title: "Collaborating schools",
            description: "Partner schools and cohorts you support will appear here.",
          },
          {
            title: "Events & outreach",
            description:
              "Upcoming workshops, demos, and student engagement events will show here.",
          },
          {
            title: "Impact reports",
            description:
              "Program outcomes and collaboration metrics will be available here.",
          },
        ]}
      />
    </DashboardShell>
  );
}
