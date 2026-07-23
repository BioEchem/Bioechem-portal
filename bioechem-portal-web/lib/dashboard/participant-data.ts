import type { SupabaseServer } from "@/lib/supabase/types";
import { letterGrade } from "@/lib/grades/format";

export type ParticipantCourse = {
  cohortId: string;
  name: string;
  schoolName: string | null;
  status: string;
};

export type ParticipantGradesSummary = {
  gradedCount: number;
  totalGraded: number;
  overallPct: number | null;
  letterGrade: string | null;
  recent: { title: string; earned: number | null; max: number; gradedAt: string }[];
};

export type ParticipantDashboardData = {
  courses: ParticipantCourse[];
  grades: ParticipantGradesSummary;
};

type EnrollmentRow = {
  cohort_id: string;
  status: string;
  cohorts: { id: string; name: string; status: string; schools: { name: string } | null } | null;
};

type GradeRow = {
  points_earned: number | null;
  graded_at: string;
  assignments: {
    max_points: number | null;
    module_items: { title: string } | null;
  } | null;
};

/** Loads real enrolled-courses + grade summary for the participant dashboard. */
export async function loadParticipantDashboardData(
  supabase: SupabaseServer,
  userId: string,
): Promise<ParticipantDashboardData> {
  const [{ data: enrollmentRows }, { data: gradeRows }] = await Promise.all([
    supabase
      .from("cohort_enrollments")
      .select("cohort_id, status, cohorts(id, name, status, schools(name))")
      .eq("user_id", userId)
      .eq("role", "participant")
      .eq("status", "approved")
      .returns<EnrollmentRow[]>(),

    supabase
      .from("grades")
      .select("points_earned, graded_at, assignments(max_points, module_items(title))")
      .eq("user_id", userId)
      .order("graded_at", { ascending: false })
      .returns<GradeRow[]>(),
  ]);

  const courses: ParticipantCourse[] = (enrollmentRows ?? [])
    .filter((e) => e.cohorts != null)
    .map((e) => ({
      cohortId: e.cohorts!.id,
      name: e.cohorts!.name,
      schoolName: e.cohorts!.schools?.name ?? null,
      status: e.cohorts!.status,
    }));

  const grades = gradeRows ?? [];
  const gradedWithPoints = grades.filter((g) => g.points_earned != null && g.assignments?.max_points);
  const totalEarned = gradedWithPoints.reduce((sum, g) => sum + (g.points_earned ?? 0), 0);
  const totalMax = gradedWithPoints.reduce((sum, g) => sum + (g.assignments?.max_points ?? 0), 0);
  const overallPct = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : null;

  return {
    courses,
    grades: {
      gradedCount: gradedWithPoints.length,
      totalGraded: grades.length,
      overallPct,
      letterGrade: letterGrade(overallPct),
      recent: grades.slice(0, 3).map((g) => ({
        title: g.assignments?.module_items?.title ?? "Assignment",
        earned: g.points_earned,
        max: g.assignments?.max_points ?? 0,
        gradedAt: g.graded_at,
      })),
    },
  };
}
