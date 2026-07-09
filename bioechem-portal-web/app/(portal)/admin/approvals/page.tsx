import type { Metadata } from "next";
import Link from "next/link";

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
  interested_in_internship: boolean;
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
      "id, email, full_name, role, other_school_name, approval_status, interested_in_internship, created_at, schools(name)",
    )
    .order("created_at", { ascending: false })
    .returns<AdminProfileRow[]>();

  const rows = users ?? [];
  const pending = rows.filter((r) => r.approval_status === "pending");
  const approved = rows.filter((r) => r.approval_status === "approved");
  const internshipInterested = rows.filter((r) => r.interested_in_internship);

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
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard label="Total users" value={rows.length} />
            <StatCard label="Waiting approval" value={pending.length} />
            <StatCard label="Approved" value={approved.length} />
            <StatCard label="Internship interest" value={internshipInterested.length} />
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
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-card-border text-bio-text-muted">
                  {["Name", "Email", "Role", "Status", "School", "Internship", "Created", ""].map((h) => (
                    <th key={h} className="py-2 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} className="py-4 text-bio-text-muted">No users found.</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id} className="border-b border-card-border/60 hover:bg-bio-mint/10 transition-colors">
                    <td className="py-2 pr-4 font-medium text-bio-text">{displayOrDash(r.full_name)}</td>
                    <td className="py-2 pr-4 text-bio-text-muted">{displayOrDash(r.email)}</td>
                    <td className="py-2 pr-4">{getRoleLabel(r.role)}</td>
                    <td className="py-2 pr-4">{getApprovalStatusLabel(r.approval_status)}</td>
                    <td className="py-2 pr-4">{displayOrDash(getSchoolDisplayName(r))}</td>
                    <td className="py-2 pr-4">
                      {r.interested_in_internship ? (
                        <span className="inline-flex items-center rounded-full bg-bio-green/10 px-2 py-0.5 text-xs font-medium text-bio-green">
                          Interested
                        </span>
                      ) : (
                        <span className="text-bio-text-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-bio-text-muted">{formatShortDate(r.created_at)}</td>
                    <td className="py-2">
                      <Link
                        href={`/admin/users/${r.id}`}
                        className="text-xs font-medium text-bio-green hover:underline whitespace-nowrap"
                      >
                        View profile →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PortalCard>
      </div>
    </PortalPage>
  );
}
