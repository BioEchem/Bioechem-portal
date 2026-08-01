import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";

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
    <div className="space-y-4">
      {/* ── Pending-action alert banner — shown first, above everything else ── */}
      {totalPending > 0 && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-5 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="text-base font-bold text-red-800">
                Action required — {totalPending} item{totalPending !== 1 ? "s" : ""} waiting on you
              </p>
              <div className="mt-3 space-y-2">
                {summary.pendingApprovals > 0 && (
                  <Link
                    href={AUTH_ROUTES.adminApprovals}
                    className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:border-red-400 hover:bg-red-50"
                  >
                    <span>
                      <strong>{summary.pendingApprovals}</strong> user{summary.pendingApprovals !== 1 ? "s" : ""} waiting for account approval
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                )}
                {summary.pendingEnrollments > 0 && (
                  <Link
                    href={AUTH_ROUTES.adminPendingEnrollments}
                    className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:border-red-400 hover:bg-red-50"
                  >
                    <span>
                      <strong>{summary.pendingEnrollments}</strong> cohort enrollment{summary.pendingEnrollments !== 1 ? "s" : ""} pending approval
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <DashboardShell
        user={user}
        subtitle={welcomeSubtitle}
        profileFields={buildDashboardProfileFields(user)}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
                Grading pending
              </h2>
              <p className="mt-2 text-sm text-bio-text-muted">
                Assignments across your cohorts with submissions still waiting to be graded.
              </p>
            </div>
            {summary.pendingGradingItems.length > 0 && (
              <Link
                href={AUTH_ROUTES.adminPendingGrading}
                className="bio-btn-primary inline-flex shrink-0"
              >
                View all
              </Link>
            )}
          </div>
          <div className="mt-4">
            {summary.pendingGradingItems.length === 0 ? (
              <p className="text-sm text-bio-text-muted">No submissions are waiting for grading right now.</p>
            ) : (
              <ul className="space-y-2">
                {summary.pendingGradingItems.map((item) => (
                  <li key={item.assignmentId}>
                    <Link
                      href={`/cohorts/${item.cohortId}?tab=assignments&assignmentId=${item.assignmentId}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-card-border px-4 py-2.5 text-sm transition-colors hover:border-bio-green/40 hover:bg-bio-mint/10"
                    >
                      <span className="text-bio-text">
                        <strong>{item.assignmentTitle}</strong> in {item.cohortName} is waiting for grading for{" "}
                        <strong>{item.studentCount}</strong> student{item.studentCount !== 1 ? "s" : ""}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-bio-text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
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
    </div>
  );
}
