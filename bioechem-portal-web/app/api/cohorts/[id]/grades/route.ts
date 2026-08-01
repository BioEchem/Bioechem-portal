import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId } = await params;

  const { data: profile } = await supabase.from("profiles").select("role, approval_status").eq("id", user.id).single();
  if (!profile || profile.approval_status !== "approved") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: enrollment } = await supabase
    .from("cohort_enrollments")
    .select("role, status")
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .maybeSingle();

  const canManage =
    profile.role === "bioechem_admin" ||
    (enrollment?.role === "teacher" && enrollment?.status === "approved");

  const isEnrolled = enrollment?.status === "approved";
  if (!canManage && !isEnrolled) return NextResponse.json({ error: "Not enrolled." }, { status: 403 });

  if (canManage) {
    // Teacher / admin: full grade book
    const { data, error } = await supabase
      .from("grades")
      .select(`
        id, points_earned, feedback, graded_at,
        assignments(id, max_points, module_items(title)),
        submissions(id, submitted_at, user_id, profiles(full_name, email))
      `)
      .eq("cohort_id", cohortId)
      .order("graded_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data, role: "teacher" });
  }

  // Participant: own grades
  const { data, error } = await supabase
    .from("grades")
    .select(`
      id, points_earned, feedback, graded_at,
      assignments(id, max_points, module_items(title, module_id))
    `)
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .order("graded_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, role: "participant" });
}
