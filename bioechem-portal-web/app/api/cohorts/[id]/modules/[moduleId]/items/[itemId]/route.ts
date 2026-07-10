import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string; moduleId: string; itemId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId, moduleId, itemId } = await params;
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
  const now = new Date().toISOString();
  const itemUpdates: Record<string, unknown> = { updated_at: now };
  if (typeof body.title === "string") itemUpdates.title = body.title.trim();
  if (typeof body.content === "string") itemUpdates.content = body.content.trim() || null;
  if (typeof body.fileUrl === "string") itemUpdates.file_url = body.fileUrl.trim() || null;
  if (typeof body.externalUrl === "string") itemUpdates.external_url = body.externalUrl.trim() || null;
  if (typeof body.published === "boolean") {
    if (body.published) {
      const { data: mod } = await supabase
        .from("modules").select("published").eq("id", moduleId).eq("cohort_id", cohortId).maybeSingle();
      if (!mod?.published) {
        return NextResponse.json(
          { error: "Publish the module before publishing items inside it." },
          { status: 400 },
        );
      }
    }
    itemUpdates.published = body.published;
  }
  if (typeof body.position === "number") itemUpdates.position = body.position;

  const { data, error } = await supabase
    .from("module_items").update(itemUpdates).eq("id", itemId).eq("cohort_id", cohortId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Update assignment metadata if provided
  if (body.dueAt !== undefined || body.maxPoints !== undefined || body.instructions !== undefined || body.submissionType !== undefined) {
    const aUpdates: Record<string, unknown> = { updated_at: now };
    if (body.dueAt !== undefined) aUpdates.due_at = typeof body.dueAt === "string" ? body.dueAt || null : null;
    if (typeof body.maxPoints === "number") aUpdates.max_points = body.maxPoints;
    if (typeof body.instructions === "string") aUpdates.instructions = body.instructions.trim() || null;
    if (typeof body.submissionType === "string") aUpdates.submission_type = body.submissionType;
    await supabase.from("assignments").update(aUpdates).eq("module_item_id", itemId);
  }

  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId, itemId } = await params;
  const { data: profile } = await supabase.from("profiles").select("role, approval_status").eq("id", user.id).single();
  if (!profile || profile.approval_status !== "approved") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let canManage = profile.role === "bioechem_admin";
  if (!canManage) {
    const { data: e } = await supabase.from("cohort_enrollments")
      .select("role, status").eq("cohort_id", cohortId).eq("user_id", user.id).maybeSingle();
    canManage = e?.role === "teacher" && e?.status === "approved";
  }
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase.from("module_items").delete().eq("id", itemId).eq("cohort_id", cohortId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
