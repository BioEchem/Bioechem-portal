import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { emailUserGraded } from "@/lib/notify/user-email";

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

  let gradeData;
  if (existing) {
    const { data, error } = await supabase
      .from("grades")
      .update({ points_earned: pointsEarned, feedback, graded_by: user.id, updated_at: now })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    gradeData = data;
  } else {
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
    gradeData = data;
  }

  // Notify the student their submission was graded
  await createNotification({
    userId: submission.user_id,
    type: "grade",
    title: "Your submission was graded",
    body: pointsEarned !== null ? `You received ${pointsEarned} points.${feedback ? " Feedback: " + feedback.slice(0, 80) : ""}` : undefined,
    link: `/cohorts/${cohortId}`,
  });

  // Email the student (fire-and-forget)
  void (async () => {
    const db = createServiceRoleClient();
    if (!db) return;
    const [studentRes, assignmentRes, cohortRes] = await Promise.all([
      db.from("profiles").select("email, full_name").eq("id", submission.user_id).single(),
      db.from("assignments").select("title, max_points").eq("id", submission.assignment_id).single(),
      db.from("cohorts").select("title").eq("id", cohortId).single(),
    ]);
    const email = studentRes.data?.email as string | null;
    if (!email) return;
    const name = (studentRes.data?.full_name as string | null) ?? email;
    const assignmentTitle = (assignmentRes.data?.title as string | null) ?? "your assignment";
    void cohortRes; // cohortId is used for the link
    emailUserGraded(email, name, assignmentTitle, pointsEarned, assignmentRes.data?.max_points ?? null, feedback, cohortId);
  })();

  // Award reward points (fire-and-forget via service role)
  await awardGradePoints({
    submissionId,
    userId: submission.user_id,
    cohortId: submission.cohort_id,
    assignmentId: submission.assignment_id,
    pointsEarned: pointsEarned ?? 0,
    awardedBy: user.id,
  });

  return NextResponse.json({ data: gradeData }, { status: existing ? 200 : 201 });
}

async function awardGradePoints({
  submissionId,
  userId,
  cohortId,
  assignmentId,
  pointsEarned,
  awardedBy,
}: {
  submissionId: string;
  userId: string;
  cohortId: string;
  assignmentId: string;
  pointsEarned: number;
  awardedBy: string;
}) {
  const db = createServiceRoleClient();
  if (!db) return;

  // Fetch assignment max_points to normalise to a 100-point scale
  const { data: assignment } = await db
    .from("assignments")
    .select("max_points, title")
    .eq("id", assignmentId)
    .single();

  const maxPts = assignment?.max_points ?? 100;
  const rewardPts = maxPts > 0
    ? Math.round((pointsEarned / maxPts) * 100)
    : 0;

  const note = `Grade: ${pointsEarned}/${maxPts} on "${assignment?.title ?? "assignment"}"`;

  // Upsert so re-grading updates the points instead of duplicating
  await db.from("point_transactions").upsert(
    {
      user_id: userId,
      cohort_id: cohortId,
      source: "grade",
      reference_id: submissionId,
      points: rewardPts,
      note,
      awarded_by: awardedBy,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id,reference_id" }
  );

  // Check if user has now completed all assignments in this cohort
  await maybeAwardCompletionBonus({ db, userId, cohortId, awardedBy });
}

async function maybeAwardCompletionBonus({
  db,
  userId,
  cohortId,
  awardedBy,
}: {
  db: NonNullable<ReturnType<typeof createServiceRoleClient>>;
  userId: string;
  cohortId: string;
  awardedBy: string;
}) {
  // Check completion bonus not already awarded
  const { data: existing } = await db
    .from("point_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .eq("source", "completion")
    .maybeSingle();
  if (existing) return;

  // Count total published assignments in cohort
  const { count: totalAssignments } = await db
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("cohort_id", cohortId)
    .eq("published", true);

  if (!totalAssignments || totalAssignments === 0) return;

  // Count graded submissions for this user in this cohort
  const { count: gradedCount } = await db
    .from("grades")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("cohort_id", cohortId);

  if ((gradedCount ?? 0) >= totalAssignments) {
    await db.from("point_transactions").insert({
      user_id: userId,
      cohort_id: cohortId,
      source: "completion",
      reference_id: cohortId,
      points: 100,
      note: "Cohort completion bonus",
      awarded_by: awardedBy,
    });
  }
}
