import { formatShortDate } from "@/lib/format/date";
import type { SupabaseServer } from "@/lib/supabase/types";

export type PendingGradingItem = {
  assignmentId: string;
  cohortId: string;
  cohortName: string;
  assignmentTitle: string;
  studentCount: number;
};

export type AdminDashboardSummary = {
  totalUsers: number;
  pendingApprovals: number;
  approvedUsers: number;
  rejectedUsers: number;
  pendingEnrollments: number;
  pendingGrading: number;
  pendingGradingItems: PendingGradingItem[];
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

type GradableAssignmentRow = {
  id: string;
  cohort_id: string;
  cohorts: { name: string } | null;
  module_items: { title: string } | null;
};

/** Summary stats for the BioEchem admin portal dashboard. */
export async function loadAdminDashboardSummary(
  supabase: SupabaseServer,
): Promise<AdminDashboardSummary> {
  const [{ data: rows }, { count: pendingEnrollmentCount }, { data: gradableAssignmentsRes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, approval_status, created_at")
      .order("created_at", { ascending: false })
      .returns<ProfileStatusRow[]>(),
    supabase
      .from("cohort_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("assignments")
      .select("id, cohort_id, cohorts(name), module_items(title)")
      .eq("requires_grading", true)
      .returns<GradableAssignmentRow[]>(),
  ]);

  const users = rows ?? [];
  const pending = users.filter((user) => user.approval_status === "pending");

  const gradableAssignments = gradableAssignmentsRes ?? [];
  const gradableAssignmentIds = gradableAssignments.map((a) => a.id);
  let pendingGrading = 0;
  let pendingGradingItems: PendingGradingItem[] = [];
  if (gradableAssignmentIds.length > 0) {
    const [{ data: submissions }, { data: grades }] = await Promise.all([
      supabase.from("submissions").select("id, assignment_id").in("assignment_id", gradableAssignmentIds),
      supabase.from("grades").select("submission_id"),
    ]);
    const gradedSubmissionIds = new Set((grades ?? []).map((g) => g.submission_id as string));
    const ungraded = (submissions ?? []).filter((s) => !gradedSubmissionIds.has(s.id as string));
    pendingGrading = ungraded.length;

    const countByAssignment = new Map<string, number>();
    for (const s of ungraded) {
      const aId = s.assignment_id as string;
      countByAssignment.set(aId, (countByAssignment.get(aId) ?? 0) + 1);
    }
    const assignmentById = new Map(gradableAssignments.map((a) => [a.id, a]));
    pendingGradingItems = [...countByAssignment.entries()]
      .map(([assignmentId, studentCount]) => {
        const a = assignmentById.get(assignmentId);
        return {
          assignmentId,
          cohortId: a?.cohort_id ?? "",
          cohortName: a?.cohorts?.name ?? "Unknown cohort",
          assignmentTitle: a?.module_items?.title ?? "Untitled assignment",
          studentCount,
        };
      })
      .filter((item) => item.cohortId)
      .sort((a, b) => b.studentCount - a.studentCount)
      .slice(0, 5);
  }

  return {
    totalUsers: users.length,
    pendingApprovals: pending.length,
    approvedUsers: users.filter((user) => user.approval_status === "approved").length,
    rejectedUsers: users.filter((user) => user.approval_status === "rejected").length,
    pendingEnrollments: pendingEnrollmentCount ?? 0,
    pendingGrading,
    pendingGradingItems,
    recentPending: pending.slice(0, 5).map((user) => ({
      id: user.id,
      fullName: user.full_name?.trim() || "—",
      email: user.email,
      role: user.role,
      signedUp: formatShortDate(user.created_at),
    })),
  };
}
