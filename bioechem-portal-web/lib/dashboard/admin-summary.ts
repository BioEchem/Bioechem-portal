import { formatShortDate } from "@/lib/format/date";
import type { SupabaseServer } from "@/lib/supabase/types";

export type AdminDashboardSummary = {
  totalUsers: number;
  pendingApprovals: number;
  approvedUsers: number;
  rejectedUsers: number;
  pendingEnrollments: number;
  recentPending: {
    id: string;
    fullName: string;
    email: string | null;
    role: string;
    signedUp: string;
  }[];
};

type ProfileStatusRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  approval_status: string;
  created_at: string;
};

/** Summary stats for the BioEchem admin portal dashboard. */
export async function loadAdminDashboardSummary(
  supabase: SupabaseServer,
): Promise<AdminDashboardSummary> {
  const [{ data: rows }, { count: pendingEnrollmentCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, approval_status, created_at")
      .order("created_at", { ascending: false })
      .returns<ProfileStatusRow[]>(),
    supabase
      .from("cohort_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const users = rows ?? [];
  const pending = users.filter((user) => user.approval_status === "pending");

  return {
    totalUsers: users.length,
    pendingApprovals: pending.length,
    approvedUsers: users.filter((user) => user.approval_status === "approved").length,
    rejectedUsers: users.filter((user) => user.approval_status === "rejected").length,
    pendingEnrollments: pendingEnrollmentCount ?? 0,
    recentPending: pending.slice(0, 5).map((user) => ({
      id: user.id,
      fullName: user.full_name?.trim() || "—",
      email: user.email,
      role: user.role,
      signedUp: formatShortDate(user.created_at),
    })),
  };
}
