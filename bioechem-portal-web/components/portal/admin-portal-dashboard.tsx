import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { PortalCard } from "@/components/portal/portal-page";
import {
  DashboardShell,
  DashboardTable,
  StatCard,
} from "@/components/portal/dashboard-ui";
import type { AdminDashboardSummary } from "@/lib/dashboard/admin-summary";
import {
  buildDashboardProfileFields,
  type DashboardUserContext,
} from "@/lib/dashboard/types";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { getRoleConfig } from "@/lib/portal/role-config";
import { getRoleLabel } from "@/lib/profile/display";

type AdminPortalDashboardProps = {
  user: DashboardUserContext;
  summary: AdminDashboardSummary;
};

export function AdminPortalDashboard({ user, summary }: AdminPortalDashboardProps) {
  const { welcomeSubtitle } = getRoleConfig(user.role);
  const totalPending = summary.pendingApprovals + summary.pendingEnrollments;

  return (
    <DashboardShell
      user={user}
      subtitle={welcomeSubtitle}
      profileFields={buildDashboardProfileFields(user)}
    >
      {/* ── Pending-action alert banner ── */}
      {totalPending > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-4 sm:flex-row sm:items-start sm:gap-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="font-semibold text-red-700">Action required</p>
            <ul className="mt-1 space-y-1 text-sm text-red-600">
              {summary.pendingApprovals > 0 && (
                <li>
                  <Link href={AUTH_ROUTES.adminApprovals} className="underline hover:no-underline">
                    {summary.pendingApprovals} user{summary.pendingApprovals !== 1 ? "s" : ""} waiting for account approval
                  </Link>
                </li>
              )}
              {summary.pendingEnrollments > 0 && (
                <li>
                  <Link href={AUTH_ROUTES.adminCohorts} className="underline hover:no-underline">
                    {summary.pendingEnrollments} cohort enrollment{summary.pendingEnrollments !== 1 ? "s" : ""} pending approval
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={summary.totalUsers} />
        <StatCard label="Pending approval" value={summary.pendingApprovals} />
        <StatCard label="Approved" value={summary.approvedUsers} />
        <StatCard label="Rejected" value={summary.rejectedUsers} />
      </div>

      <PortalCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
              User approvals
            </h2>
            <p className="mt-2 text-sm text-bio-text-muted">
              Review new signups, approve access, or reject with a reason.
            </p>
          </div>
          <Link
            href={AUTH_ROUTES.adminApprovals}
            className="bio-btn-primary inline-flex shrink-0"
          >
            Manage approvals
          </Link>
        </div>
        <div className="mt-4">
          <DashboardTable
            headers={["Name", "Email", "Role", "Signed up"]}
            rows={summary.recentPending.map((row) => [
              row.fullName,
              row.email ?? "—",
              getRoleLabel(row.role),
              row.signedUp,
            ])}
            emptyMessage="No users are waiting for approval."
          />
        </div>
      </PortalCard>

      <PortalCard>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
          Platform overview
        </h2>
        <p className="mt-3 text-sm text-bio-text-muted">
          School management, curriculum configuration, and system settings will
          be added to this dashboard in future updates.
        </p>
      </PortalCard>
    </DashboardShell>
  );
}
