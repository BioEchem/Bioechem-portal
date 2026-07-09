import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { supabase } = auth;

  // Run all queries in parallel
  const [
    cohortsRes,
    enrollmentsRes,
    assignmentsRes,
    submissionsRes,
    gradesRes,
    profilesRes,
  ] = await Promise.all([
    supabase
      .from("cohorts")
      .select("id, name, school_id, is_active, created_at, schools(name)")
      .order("created_at", { ascending: false }),

    supabase
      .from("cohort_enrollments")
      .select("cohort_id, user_id, role, status"),

    supabase
      .from("assignments")
      .select("id, cohort_id, max_points, requires_grading, grade_category, due_at"),

    supabase
      .from("submissions")
      .select("id, cohort_id, assignment_id, student_id, submitted_at"),

    supabase
      .from("grades")
      .select("submission_id, points_earned, cohort_id"),

    supabase
      .from("profiles")
      .select("id, approval_status, role, created_at"),
  ]);

  const cohorts = cohortsRes.data ?? [];
  const enrollments = enrollmentsRes.data ?? [];
  const assignments = assignmentsRes.data ?? [];
  const submissions = submissionsRes.data ?? [];
  const grades = gradesRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  // Build per-cohort stats
  const cohortStats = cohorts.map((cohort) => {
    const cohortEnrollments = enrollments.filter((e) => e.cohort_id === cohort.id);
    const participants = cohortEnrollments.filter((e) => e.role === "participant" && e.status === "approved");
    const teachers = cohortEnrollments.filter((e) => e.role === "teacher" && e.status === "approved");
    const pending = cohortEnrollments.filter((e) => e.status === "pending");

    const cohortAssignments = assignments.filter((a) => a.cohort_id === cohort.id);
    const gradedAssignments = cohortAssignments.filter((a) => a.requires_grading);

    const cohortSubmissions = submissions.filter((s) => s.cohort_id === cohort.id);
    const cohortGrades = grades.filter((g) => g.cohort_id === cohort.id);

    // Submission rate: submitted / expected (participants × graded assignments)
    const expectedSubmissions = participants.length * gradedAssignments.length;
    const submissionRate = expectedSubmissions > 0
      ? Math.round((cohortSubmissions.length / expectedSubmissions) * 100)
      : null;

    // Average grade across all graded submissions
    const gradedWithPoints = cohortGrades.filter((g) => g.points_earned != null);
    const avgGrade = gradedWithPoints.length > 0
      ? Math.round(gradedWithPoints.reduce((sum, g) => sum + (g.points_earned ?? 0), 0) / gradedWithPoints.length * 10) / 10
      : null;

    // Grade distribution: count per grade range (0-59, 60-69, 70-79, 80-89, 90-100)
    // as percentage of max_points per assignment
    const gradePcts: number[] = [];
    for (const grade of gradedWithPoints) {
      const sub = submissions.find((s) => s.id === grade.submission_id);
      if (!sub) continue;
      const assignment = gradedAssignments.find((a) => a.id === sub.assignment_id);
      if (!assignment?.max_points) continue;
      gradePcts.push((grade.points_earned ?? 0) / assignment.max_points * 100);
    }
    const gradeDistribution = {
      a: gradePcts.filter((p) => p >= 90).length,
      b: gradePcts.filter((p) => p >= 80 && p < 90).length,
      c: gradePcts.filter((p) => p >= 70 && p < 80).length,
      d: gradePcts.filter((p) => p >= 60 && p < 70).length,
      f: gradePcts.filter((p) => p < 60).length,
    };

    return {
      id: cohort.id,
      name: cohort.name,
      school: (cohort.schools as unknown as { name: string } | null)?.name ?? null,
      is_active: cohort.is_active,
      created_at: cohort.created_at,
      participants: participants.length,
      teachers: teachers.length,
      pending_enrollments: pending.length,
      total_assignments: cohortAssignments.length,
      graded_assignments: gradedAssignments.length,
      total_submissions: cohortSubmissions.length,
      submission_rate: submissionRate,
      avg_grade: avgGrade,
      grade_distribution: gradeDistribution,
    };
  });

  // Platform-wide summary
  const approved = profiles.filter((p) => p.approval_status === "approved");
  const pendingProfiles = profiles.filter((p) => p.approval_status === "pending");
  const byRole = approved.reduce<Record<string, number>>((acc, p) => {
    acc[p.role] = (acc[p.role] ?? 0) + 1;
    return acc;
  }, {});

  // Signups over last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recentSignups = profiles.filter((p) => p.created_at >= thirtyDaysAgo).length;

  const summary = {
    total_users: profiles.length,
    approved_users: approved.length,
    pending_users: pendingProfiles.length,
    recent_signups_30d: recentSignups,
    users_by_role: byRole,
    total_cohorts: cohorts.length,
    active_cohorts: cohorts.filter((c) => c.is_active).length,
    total_submissions: submissions.length,
    total_grades: grades.length,
  };

  return NextResponse.json({ summary, cohorts: cohortStats });
}
