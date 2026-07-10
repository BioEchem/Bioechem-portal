import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string; quizId: string; submissionId: string }> };

/** Teacher/admin: award manual points for a quiz submission's short-answer questions. */
export async function PATCH(req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId, submissionId } = await params;

  const { data: profile } = await supabase.from("profiles").select("role, approval_status").eq("id", user.id).single();
  if (!profile || profile.approval_status !== "approved") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let canManage = profile.role === "bioechem_admin";
  if (!canManage) {
    const { data: e } = await supabase.from("cohort_enrollments")
      .select("role, status").eq("cohort_id", cohortId).eq("user_id", user.id).maybeSingle();
    canManage = e?.role === "teacher" && e?.status === "approved";
  }
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as Record<string, unknown>;
  const manualScore = typeof body.manual_score === "number" ? body.manual_score : null;
  const feedback = typeof body.feedback === "string" ? body.feedback.trim() || null : null;

  const { data, error } = await supabase
    .from("quiz_submissions")
    .update({
      manual_score: manualScore,
      feedback,
      needs_grading: false,
      graded_by: user.id,
      graded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .eq("cohort_id", cohortId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
