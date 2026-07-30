import { getCohortDisplayName } from "@/lib/profile/display";
import type { SupabaseServer } from "@/lib/supabase/types";

type SchoolAdminCohortRow = {
  id: string;
  name: string;
  enrolledCount: number;
  isActive: boolean;
};

type SchoolAdminCohortAverage = {
  cohortId: string;
  cohortName: string;
  gradedCount: number;
  averagePercent: number | null;
};

type SchoolAdminCurriculumEntry = {
  cohortId: string;
  cohortName: string;
  moduleCount: number;
};

type SchoolAdminStudentRow = {
  id: string;
  fullName: string;
  email: string | null;
  cohortName: string | null;
  age: number | null;
};

type SchoolAdminTeacherRow = {
  id: string;
  fullName: string;
  email: string | null;
};

export type SchoolAdminDashboardData = {
  schoolName: string;
  adminName: string;
  adminEmail: string;
  cohorts: SchoolAdminCohortRow[];
  students: SchoolAdminStudentRow[];
  teachers: SchoolAdminTeacherRow[];
  gradeAverages: SchoolAdminCohortAverage[];
  curriculum: SchoolAdminCurriculumEntry[];
  stats: {
    activeCohorts: number;
    totalTeachers: number;
    totalEnrolled: number;
  };
};

type SchoolMemberRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  age: number | null;
  cohort_id: string | null;
  approval_status: string;
  cohorts: { name: string } | { name: string }[] | null;
};

/** Loads school-scoped dashboard data for an approved school admin. */
export async function loadSchoolAdminDashboard(
  supabase: SupabaseServer,
  schoolId: string,
  adminName: string,
  adminEmail: string,
): Promise<SchoolAdminDashboardData | null> {
  const { data: school } = await supabase
    .from("schools")
    .select("name")
    .eq("id", schoolId)
    .maybeSingle();

  if (!school) return null;

  const [{ data: cohortRows }, { data: memberRows }] = await Promise.all([
    supabase
      .from("cohorts")
      .select("id, name, is_active")
      .eq("school_id", schoolId)
      .order("name"),
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, age, cohort_id, approval_status, cohorts(name)",
      )
      .eq("school_id", schoolId)
      .eq("approval_status", "approved")
      .in("role", ["participant", "teacher"])
      .returns<SchoolMemberRow[]>(),
  ]);

  const members = memberRows ?? [];
  const students = members.filter((member) => member.role === "participant");
  const teachers = members.filter((member) => member.role === "teacher");

  const cohorts = (cohortRows ?? []).map((cohort) => ({
    id: cohort.id,
    name: cohort.name,
    isActive: cohort.is_active,
    enrolledCount: students.filter((student) => student.cohort_id === cohort.id)
      .length,
  }));

  const cohortIds = cohorts.map((c) => c.id);
  const cohortNameById = new Map(cohorts.map((c) => [c.id, c.name]));

  const [{ data: gradeRows }, { data: moduleRows }] = cohortIds.length > 0
    ? await Promise.all([
        supabase
          .from("grades")
          .select("cohort_id, points_earned, assignments(max_points)")
          .in("cohort_id", cohortIds)
          .returns<{ cohort_id: string; points_earned: number | null; assignments: { max_points: number | null } | { max_points: number | null }[] | null }[]>(),
        supabase
          .from("modules")
          .select("cohort_id")
          .in("cohort_id", cohortIds)
          .eq("published", true),
      ])
    : [{ data: [] }, { data: [] }];

  const gradesByCohort = new Map<string, { total: number; count: number }>();
  for (const g of gradeRows ?? []) {
    const maxPoints = Array.isArray(g.assignments) ? g.assignments[0]?.max_points : g.assignments?.max_points;
    if (g.points_earned == null || !maxPoints || maxPoints <= 0) continue;
    const pct = (g.points_earned / maxPoints) * 100;
    const entry = gradesByCohort.get(g.cohort_id) ?? { total: 0, count: 0 };
    entry.total += pct;
    entry.count += 1;
    gradesByCohort.set(g.cohort_id, entry);
  }

  const gradeAverages: SchoolAdminCohortAverage[] = cohorts.map((cohort) => {
    const entry = gradesByCohort.get(cohort.id);
    return {
      cohortId: cohort.id,
      cohortName: cohort.name,
      gradedCount: entry?.count ?? 0,
      averagePercent: entry && entry.count > 0 ? Math.round(entry.total / entry.count) : null,
    };
  });

  const moduleCountByCohort = new Map<string, number>();
  for (const m of moduleRows ?? []) {
    moduleCountByCohort.set(m.cohort_id, (moduleCountByCohort.get(m.cohort_id) ?? 0) + 1);
  }

  const curriculum: SchoolAdminCurriculumEntry[] = cohorts.map((cohort) => ({
    cohortId: cohort.id,
    cohortName: cohortNameById.get(cohort.id) ?? cohort.name,
    moduleCount: moduleCountByCohort.get(cohort.id) ?? 0,
  }));

  return {
    schoolName: school.name,
    adminName,
    adminEmail,
    cohorts,
    students: students.map((student) => ({
      id: student.id,
      fullName: student.full_name?.trim() || "—",
      email: student.email,
      cohortName: getCohortDisplayName(student.cohorts),
      age: student.age,
    })),
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      fullName: teacher.full_name?.trim() || "—",
      email: teacher.email,
    })),
    gradeAverages,
    curriculum,
    stats: {
      activeCohorts: cohorts.filter((cohort) => cohort.isActive).length,
      totalTeachers: teachers.length,
      totalEnrolled: students.length,
    },
  };
}
