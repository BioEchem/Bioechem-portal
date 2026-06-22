import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string; submissionId: string }> };

export async function POST(req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId, submissionId } = await params;

  const { data: profile } = await supabase.from("profiles").select("role, approval_status").eq("id", user.id).single();
  if (!profile || profile.approval_status !== "approved") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let canGrade = profile.role === "bioechem_admin";
  if (!canGrade) {
    const { data: e } = await supabase.from("cohort_enrollments")
      .select("role, status").eq("cohort_id", cohortId).eq("user_id", user.id).maybeSingle();
    canGrade = e?.role === "teacher" && e?.status === "approved";
  }
  if (!canGrade) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, assignment_id, user_id, cohort_id")
    .eq("id", submissionId)
    .single();

  if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  const body = await req.json() as Record<string, unknown>;
  const pointsEarned = typeof body.points_earned === "number" ? body.points_earned : null;
  const feedback = typeof body.feedback === "string" ? body.feedback.trim() || null : null;
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("grades").select("id").eq("submission_id", submissionId).maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("grades")
      .update({ points_earned: pointsEarned, feedback, graded_by: user.id, updated_at: now })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }

  const { data, error } = await supabase
    .from("grades")
    .insert({
      submission_id: submissionId,
      assignment_id: submission.assignment_id,
      user_id: submission.user_id,
      cohort_id: submission.cohort_id,
      graded_by: user.id,
      points_earned: pointsEarned,
      feedback,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
