import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

type Params = { params: Promise<{ id: string; sessionId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id: cohortId, sessionId } = await params;
  const { supabase, profile } = await requireSession({ requireApproved: true, profileSelect: "role, approval_status" });

  const canWrite = ["teacher", "bioechem_admin"].includes(profile.role ?? "");
  if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as Record<string, unknown>;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.description === "string") patch.description = body.description.trim() || null;
  if (typeof body.scheduled_at === "string") patch.scheduled_at = body.scheduled_at;
  if (typeof body.duration_minutes === "number") patch.duration_minutes = body.duration_minutes;
  if (typeof body.meeting_url === "string") patch.meeting_url = body.meeting_url.trim() || null;
  if (typeof body.status === "string" && ["scheduled", "live", "ended"].includes(body.status)) {
    patch.status = body.status;
  }

  const { data, error } = await supabase
    .from("class_sessions")
    .update(patch)
    .eq("id", sessionId)
    .eq("cohort_id", cohortId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id: cohortId, sessionId } = await params;
  const { supabase, profile } = await requireSession({ requireApproved: true, profileSelect: "role, approval_status" });

  const canWrite = ["teacher", "bioechem_admin"].includes(profile.role ?? "");
  if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("class_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("cohort_id", cohortId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return new NextResponse(null, { status: 204 });
}
