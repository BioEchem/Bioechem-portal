import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id: cohortId } = await params;
  const { supabase, profile } = await requireSession({ requireApproved: true, profileSelect: "role, approval_status" });

  const canManage = ["teacher", "bioechem_admin"].includes(profile.role ?? "");

  let query = supabase
    .from("session_recordings")
    .select("id, cohort_id, session_id, title, description, video_url, file_path, thumbnail_url, published, created_at")
    .eq("cohort_id", cohortId)
    .order("created_at", { ascending: false });

  if (!canManage) query = query.eq("published", true);

  const { data, error } = await query;
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
  if (!title) return NextResponse.json({ error: "title is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("session_recordings")
    .insert({
      cohort_id: cohortId,
      title,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      video_url: typeof body.video_url === "string" ? body.video_url.trim() || null : null,
      session_id: typeof body.session_id === "string" ? body.session_id || null : null,
      published: body.published === true,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
