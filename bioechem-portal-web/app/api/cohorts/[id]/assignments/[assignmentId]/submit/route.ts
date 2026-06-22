import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string; assignmentId: string }> };

export async function POST(req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId, assignmentId } = await params;

  const { data: enrollment } = await supabase
    .from("cohort_enrollments")
    .select("role, status")
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (enrollment?.role !== "participant" || enrollment?.status !== "approved") {
    return NextResponse.json({ error: "Only enrolled participants can submit." }, { status: 403 });
  }

  const body = await req.json() as Record<string, unknown>;
  const submissionText = typeof body.submission_text === "string" ? body.submission_text.trim() || null : null;
  const fileUrl = typeof body.file_url === "string" ? body.file_url.trim() || null : null;
  const filename = typeof body.filename === "string" ? body.filename.trim() || null : null;

  if (!submissionText && !fileUrl) {
    return NextResponse.json({ error: "Provide text or a file." }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Upsert — allow resubmission
  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("submissions")
      .update({ submission_text: submissionText, file_url: fileUrl, filename, updated_at: now })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }

  const { data, error } = await supabase
    .from("submissions")
    .insert({
      assignment_id: assignmentId,
      user_id: user.id,
      cohort_id: cohortId,
      submission_text: submissionText,
      file_url: fileUrl,
      filename,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
