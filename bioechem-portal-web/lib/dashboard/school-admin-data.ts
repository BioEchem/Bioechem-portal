import { getCohortDisplayName } from "@/lib/profile/display";
import type { SupabaseServer } from "@/lib/supabase/types";

type SchoolAdminCohortRow = {
  id: string;
  name: string;
  enrolledCount: number;
  isActive: boolean;
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
    stats: {
      activeCohorts: cohorts.filter((cohort) => cohort.isActive).length,
      totalTeachers: teachers.length,
      totalEnrolled: students.length,
    },
  };
}
