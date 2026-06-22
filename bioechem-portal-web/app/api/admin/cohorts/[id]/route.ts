import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function assertCanManage(supabase: Awaited<ReturnType<typeof createClient>>, cohortId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles").select("role, approval_status, school_id").eq("id", user.id).single();
  if (!profile || profile.approval_status !== "approved") return false;
  if (profile.role === "bioechem_admin") return true;
  if (profile.role === "school_admin" && profile.school_id) {
    const { data: cohort } = await supabase
      .from("cohorts").select("school_id").eq("id", cohortId).single();
    return cohort?.school_id === profile.school_id;
  }
  return false;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { id } = await params;

  if (!await assertCanManage(supabase, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as Record<string, unknown>;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.description === "string") updates.description = body.description.trim() || null;
  if (typeof body.startDate === "string") updates.start_date = body.startDate || null;
  if (typeof body.endDate === "string") updates.end_date = body.endDate || null;
  if (typeof body.maxEnrollment === "number") updates.max_enrollment = body.maxEnrollment > 0 ? body.maxEnrollment : null;
  if (body.maxEnrollment === null) updates.max_enrollment = null;
  if (typeof body.enrollmentRequiresApproval === "boolean") updates.enrollment_requires_approval = body.enrollmentRequiresApproval;
  if (typeof body.status === "string" && ["draft","active","archived"].includes(body.status)) {
    updates.status = body.status;
    updates.is_active = body.status === "active";
  }

  const { data, error } = await supabase
    .from("cohorts").update(updates).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
