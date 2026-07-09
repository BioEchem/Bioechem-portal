import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emailTeachersNewSubmission } from "@/lib/notify/user-email";

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

  // Notify teachers in this cohort (fire-and-forget, only on new submission)
  void (async () => {
    const [studentRes, cohortRes, assignmentRes, teacherRes] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
      supabase.from("cohorts").select("title").eq("id", cohortId).single(),
      supabase.from("assignments").select("module_item_id, module_items(title)").eq("id", assignmentId).single(),
      supabase.from("cohort_enrollments").select("profiles(email, full_name)").eq("cohort_id", cohortId).eq("role", "teacher").eq("status", "approved"),
    ]);
    const studentName = (studentRes.data?.full_name as string | null) ?? (studentRes.data?.email as string | null) ?? "A student";
    const cohortName = (cohortRes.data?.title as string | null) ?? "the cohort";
    const assignmentTitle = (assignmentRes.data?.module_items as unknown as { title: string } | null)?.title ?? "an assignment";
    const teachers = (teacherRes.data ?? []).flatMap((e) => {
      const p = e.profiles as unknown as { email: string | null; full_name: string | null } | null;
      return p?.email ? [{ email: p.email, name: p.full_name ?? p.email }] : [];
    });
    if (teachers.length > 0) {
      emailTeachersNewSubmission(teachers, cohortName, studentName, assignmentTitle, cohortId);
    }
  })();

  return NextResponse.json({ data }, { status: 201 });
}
