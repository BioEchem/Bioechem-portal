import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { supabase, user } = await requireSession({ requireApproved: true });
  const { id: jobId } = await params;

  const body = await req.json() as Record<string, unknown>;
  const coverLetter = typeof body.cover_letter === "string" ? body.cover_letter.trim() || null : null;

  const { data, error } = await supabase
    .from("job_applications")
    .insert({ job_id: jobId, user_id: user.id, cover_letter: coverLetter })
    .select("id, status, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You have already applied to this job." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { supabase, user } = await requireSession({ requireApproved: true });
  const { id: jobId } = await params;

  const { error } = await supabase
    .from("job_applications")
    .delete()
    .eq("job_id", jobId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
