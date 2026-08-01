import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

type Params = { params: Promise<{ id: string; recordingId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id: cohortId, recordingId } = await params;
  const { supabase, profile } = await requireSession({ requireApproved: true, profileSelect: "role, approval_status" });

  const canWrite = ["teacher", "bioechem_admin"].includes(profile.role ?? "");
  if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as Record<string, unknown>;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.description === "string") patch.description = body.description.trim() || null;
  if (typeof body.video_url === "string") patch.video_url = body.video_url.trim() || null;
  if (typeof body.published === "boolean") patch.published = body.published;

  const { data, error } = await supabase
    .from("session_recordings")
    .update(patch)
    .eq("id", recordingId)
    .eq("cohort_id", cohortId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id: cohortId, recordingId } = await params;
  const { supabase, profile } = await requireSession({ requireApproved: true, profileSelect: "role, approval_status" });

  const canWrite = ["teacher", "bioechem_admin"].includes(profile.role ?? "");
  if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("session_recordings")
    .delete()
    .eq("id", recordingId)
    .eq("cohort_id", cohortId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return new NextResponse(null, { status: 204 });
}
