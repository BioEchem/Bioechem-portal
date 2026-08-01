import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id: cohortId } = await params;
  const { supabase } = await requireSession({ requireApproved: true });

  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, cohort_id, title, description, scheduled_at, duration_minutes, jitsi_room, status, created_by, created_at")
    .eq("cohort_id", cohortId)
    .order("scheduled_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request, { params }: Params) {
  const { id: cohortId } = await params;
  const { supabase, user, profile } = await requireSession({ requireApproved: true, profileSelect: "role, approval_status" });

  const canWrite = ["teacher", "bioechem_admin"].includes(profile.role ?? "");
  if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const scheduled_at = typeof body.scheduled_at === "string" ? body.scheduled_at : "";
  const duration_minutes = typeof body.duration_minutes === "number" ? body.duration_minutes : 60;

  if (!title || !scheduled_at) {
    return NextResponse.json({ error: "title and scheduled_at are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("class_sessions")
    .insert({
      cohort_id: cohortId,
      title,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      scheduled_at,
      duration_minutes,
      meeting_url: typeof body.meeting_url === "string" ? body.meeting_url.trim() || null : null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
