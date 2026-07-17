import type { Metadata } from "next";

import { AdminApprovalsView, type ApprovalUserRow } from "@/components/admin/admin-approvals-view";
import { PortalPage } from "@/components/portal/portal-page";
import { requireSession } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/format/date";
import { displayOrDash, getSchoolDisplayName } from "@/lib/profile/display";

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

  const rows: ApprovalUserRow[] = (users ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    role: r.role,
    schoolName: displayOrDash(getSchoolDisplayName(r)),
    approvalStatus: r.approval_status,
    interestedInInternship: r.interested_in_internship,
    signedUp: formatShortDate(r.created_at),
  }));

  return (
    <PortalPage
      title="User approvals"
      description="Review signups, approve or reject accounts, and manage all portal users."
    >
      <AdminApprovalsView rows={rows} />
    </PortalPage>
  );
}
