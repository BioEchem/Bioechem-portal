import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string; userId: string }> };

function letterGrade(p: number | null): string {
  if (p == null) return "—";
  if (p >= 90) return "A";
  if (p >= 80) return "B";
  if (p >= 70) return "C";
  if (p >= 60) return "D";
  return "F";
}

export async function GET(_req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId, userId: targetUserId } = await params;

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role, approval_status, school_id")
    .eq("id", user.id)
    .single();

  if (!viewerProfile || viewerProfile.approval_status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const viewerRole = viewerProfile.role ?? "";
  const isBioAdmin = viewerRole === "bioechem_admin";
  const isSchoolAdmin = viewerRole === "school_admin";

  // Fetch cohort to validate access
  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, name, school_id")
    .eq("id", cohortId)
    .single();

  if (!cohort) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isBioAdmin) {
    if (isSchoolAdmin) {
      const vp = viewerProfile as typeof viewerProfile & { school_id: string | null };
      if ((cohort as Record<string, unknown>).school_id !== vp.school_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // Must be approved+enrolled in this cohort
      const { data: ve } = await supabase
        .from("cohort_enrollments")
        .select("id")
        .eq("cohort_id", cohortId)
        .eq("user_id", user.id)
        .eq("status", "approved")
        .maybeSingle();
      if (!ve) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Viewer's enrollment role (to check if teacher)
  let viewerEnrollmentRole: string | null = null;
  if (!isSchoolAdmin && !isBioAdmin) {
    const { data: ve } = await supabase
      .from("cohort_enrollments")
      .select("role")
      .eq("cohort_id", cohortId)
      .eq("user_id", user.id)
      .eq("status", "approved")
      .maybeSingle();
    viewerEnrollmentRole = ve?.role ?? null;
  }

  const isTeacherInCohort = viewerEnrollmentRole === "teacher";
  const canSeeGrades = isBioAdmin || isSchoolAdmin || isTeacherInCohort;

  // Target user's enrollment + profile
  type EnrollmentRow = {
    role: string;
    status: string;
    enrolled_at: string;
    profiles: { full_name: string | null; email: string | null; bio: string | null; schools: { name: string } | { name: string }[] | null } | null;
  };

  const { data: targetEnrollment } = await supabase
    .from("cohort_enrollments")
    .select("role, status, enrolled_at, profiles!user_id(full_name, email, bio, schools(name))")
    .eq("cohort_id", cohortId)
    .eq("user_id", targetUserId)
    .maybeSingle()
    .returns<EnrollmentRow>();

  if (!targetEnrollment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tp = targetEnrollment.profiles;
  const schoolRaw = tp?.schools;
  const school = Array.isArray(schoolRaw)
    ? (schoolRaw[0] as { name: string } | undefined)?.name ?? null
    : (schoolRaw as { name: string } | null)?.name ?? null;

  // Grades (only if viewer can see them and target is a participant)
  let grades = null;
  if (canSeeGrades && targetEnrollment.role === "participant") {
    type GradeRow = {
      points_earned: number | null;
      assignments: { max_points: number; module_items: { title: string } | null } | null;
    };
    const { data: gradeData } = await supabase
      .from("grades")
      .select("points_earned, assignments(max_points, module_items(title))")
      .eq("cohort_id", cohortId)
      .eq("user_id", targetUserId)
      .returns<GradeRow[]>();

    if (gradeData) {
      const totalEarned = gradeData.reduce((s, g) => s + (g.points_earned ?? 0), 0);
      const totalMax = gradeData.reduce((s, g) => s + (g.assignments?.max_points ?? 0), 0);
      const overallPct = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : null;

      grades = {
        totalEarned,
        totalMax,
        pct: overallPct,
        letter: letterGrade(overallPct),
        entries: gradeData.map((g) => ({
          title: g.assignments?.module_items?.title ?? "Assignment",
          earned: g.points_earned,
          max: g.assignments?.max_points ?? 0,
        })),
      };
    }
  }

  return NextResponse.json({
    name: tp?.full_name ?? null,
    email: tp?.email ?? null,
    cohortRole: targetEnrollment.role,
    status: targetEnrollment.status,
    enrolledAt: targetEnrollment.enrolled_at,
    cohortName: (cohort as Record<string, unknown>).name as string,
    school,
    bio: isBioAdmin ? (tp?.bio ?? null) : null,
    grades,
  });
}
