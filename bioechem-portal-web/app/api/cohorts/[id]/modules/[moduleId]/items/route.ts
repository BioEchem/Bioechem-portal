import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emailUsersNewAssignment } from "@/lib/notify/user-email";

type Params = { params: Promise<{ id: string; moduleId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId, moduleId } = await params;

  const { data: enrollment } = await supabase
    .from("cohort_enrollments")
    .select("role, status")
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const canManage =
    profile?.role === "bioechem_admin" ||
    (enrollment?.role === "teacher" && enrollment?.status === "approved");
  const isEnrolled = enrollment?.status === "approved";

  if (!canManage && !isEnrolled) return NextResponse.json({ error: "Not enrolled." }, { status: 403 });

  let query = supabase
    .from("module_items")
    .select(`id, type, title, content, file_url, external_url, position, published, created_at,
      assignments(id, due_at, max_points, submission_type)`)
    .eq("module_id", moduleId)
    .eq("cohort_id", cohortId)
    .order("position");

  if (!canManage) query = query.eq("published", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId, moduleId } = await params;

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
  const type = typeof body.type === "string" ? body.type : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!["note", "assignment", "file", "link"].includes(type) || !title) {
    return NextResponse.json({ error: "Valid type and title are required." }, { status: 400 });
  }

  const { data: last } = await supabase
    .from("module_items").select("position").eq("module_id", moduleId)
    .order("position", { ascending: false }).limit(1).maybeSingle();

  const { data: item, error: itemErr } = await supabase
    .from("module_items")
    .insert({
      module_id: moduleId,
      cohort_id: cohortId,
      type,
      title,
      content: typeof body.content === "string" ? body.content.trim() || null : null,
      file_url: typeof body.file_url === "string" ? body.file_url.trim() || null : null,
      external_url: typeof body.external_url === "string" ? body.external_url.trim() || null : null,
      position: (last?.position ?? -1) + 1,
      published: body.published !== false,
      created_by: user.id,
    })
    .select()
    .single();

  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 400 });

  // For assignments: also create the assignments row
  if (type === "assignment") {
    const dueAt = typeof body.due_at === "string" ? body.due_at || null : null;
    const maxPoints = typeof body.max_points === "number" ? body.max_points : 100;
    const requiresGrading = body.requires_grading !== false;
    const gradeCategory = typeof body.grade_category === "string" && ["intermediate","final"].includes(body.grade_category)
      ? body.grade_category : "intermediate";
    const assignmentType = typeof body.assignment_type === "string" && ["assignment","presentation","field_trip","quiz","other"].includes(body.assignment_type)
      ? body.assignment_type : "assignment";
    const submissionType = typeof body.submission_type === "string" ? body.submission_type : "any";

    const { error: aErr } = await supabase.from("assignments").insert({
      module_item_id: item.id,
      cohort_id: cohortId,
      due_at: dueAt,
      max_points: requiresGrading ? maxPoints : null,
      requires_grading: requiresGrading,
      grade_category: gradeCategory,
      assignment_type: assignmentType,
      submission_type: submissionType,
      instructions: typeof body.instructions === "string" ? body.instructions.trim() || null : null,
    });

    if (aErr) {
      // Roll back the module item so no orphan is left
      await supabase.from("module_items").delete().eq("id", item.id);
      return NextResponse.json({ error: aErr.message }, { status: 400 });
    }

    // Notify enrolled participants (fire-and-forget)
    if (item.published) {
      Promise.all([
        supabase.from("cohorts").select("title").eq("id", cohortId).single(),
        supabase
          .from("cohort_enrollments")
          .select("profiles(email, full_name)")
          .eq("cohort_id", cohortId)
          .eq("role", "participant")
          .eq("status", "approved"),
      ]).then(([cohortRes, enrollRes]) => {
        const cohortName = cohortRes.data?.title ?? "your cohort";
        const recipients = (enrollRes.data ?? []).flatMap((e) => {
          const p = e.profiles as unknown as { email: string | null; full_name: string | null } | null;
          return p?.email ? [{ email: p.email, name: p.full_name ?? p.email }] : [];
        });
        if (recipients.length > 0) {
          emailUsersNewAssignment(recipients, cohortName, title, dueAt, cohortId);
        }
      }).catch(() => {});
    }
  }

  return NextResponse.json({ data: item }, { status: 201 });
}
