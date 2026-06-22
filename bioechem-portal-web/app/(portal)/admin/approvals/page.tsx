import type { Metadata } from "next";

import { PendingApprovalsTable } from "@/components/admin/pending-approvals-table";
import { DashboardTable, StatCard } from "@/components/portal/dashboard-ui";
import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { requireSession } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/format/date";
import {
  displayOrDash,
  getApprovalStatusLabel,
  getRoleLabel,
  getSchoolDisplayName,
} from "@/lib/profile/display";

type AdminProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  other_school_name: string | null;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
  schools: { name: string } | { name: string }[] | null;
};

export const metadata: Metadata = {
  title: "User approvals",
};

export default async function AdminApprovalsPage() {
  const { supabase } = await requireSession({
    requireApproved: true,
    requiredRole: "bioechem_admin",
  });

  const { data: users } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, other_school_name, approval_status, created_at, schools(name)",
    )
    .order("created_at", { ascending: false })
    .returns<AdminProfileRow[]>();

  const rows = users ?? [];
  const pending = rows.filter((r) => r.approval_status === "pending");
  const approved = rows.filter((r) => r.approval_status === "approved");

  const pendingRows = pending.map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    role: r.role,
    schoolName: displayOrDash(getSchoolDisplayName(r)),
    signedUp: formatShortDate(r.created_at),
  }));

  return (
    <PortalPage
      title="User approvals"
      description="Review signups, approve or reject accounts, and manage all portal users."
    >
      <div className="space-y-4">
        <PortalCard>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Total users" value={rows.length} />
            <StatCard label="Waiting approval" value={pending.length} />
            <StatCard label="Approved" value={approved.length} />
          </div>
        </PortalCard>

        <PortalCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
              Waiting for approval
            </h2>
            <span className="text-xs text-bio-text-muted">{pending.length} pending</span>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-bio-text-muted">No users are waiting right now.</p>
          ) : (
            <PendingApprovalsTable rows={pendingRows} />
          )}
        </PortalCard>

        <PortalCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
              All users
            </h2>
            <span className="text-xs text-bio-text-muted">Latest first</span>
          </div>
          <DashboardTable
            headers={["Name", "Email", "Role", "Status", "School", "Created"]}
            rows={rows.map((r) => [
              displayOrDash(r.full_name),
              displayOrDash(r.email),
              getRoleLabel(r.role),
              getApprovalStatusLabel(r.approval_status),
              displayOrDash(getSchoolDisplayName(r)),
              formatShortDate(r.created_at),
            ])}
            emptyMessage="No users found."
          />
        </PortalCard>
      </div>
    </PortalPage>
  );
}
