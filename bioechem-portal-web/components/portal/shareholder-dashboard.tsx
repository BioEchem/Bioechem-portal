import { DashboardPlaceholderGrid, DashboardShell } from "@/components/portal/dashboard-ui";
import {
  buildDashboardProfileFields,
  type DashboardUserContext,
} from "@/lib/dashboard/types";
import { getRoleConfig } from "@/lib/portal/role-config";

type ShareholderDashboardProps = {
  user: DashboardUserContext;
};

export function ShareholderDashboard({ user }: ShareholderDashboardProps) {
  const { welcomeSubtitle } = getRoleConfig(user.role);

  return (
    <DashboardShell
      user={user}
      subtitle={welcomeSubtitle}
      profileFields={buildDashboardProfileFields(user)}
    >
      <DashboardPlaceholderGrid
        items={[
          {
            title: "Company updates",
            description:
              "News, milestones, and announcements from BioEchem will appear here.",
          },
          {
            title: "Reports & documents",
            description:
              "Financial reports, board materials, and shareholder documents will be shared here.",
          },
          {
            title: "Program impact",
            description:
              "High-level metrics on schools, students, and program reach will be summarized here.",
          },
          {
            title: "Meetings & governance",
            description:
              "Shareholder meeting schedules and voting information will be listed here.",
          },
        ]}
      />
    </DashboardShell>
  );
}
