import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;
  const { id } = await params;

  const { data: survey, error } = await supabase
    .from("surveys")
    .select("*, cohorts(id, name)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: "Survey not found." }, { status: 404 });

  const { count } = await supabase
    .from("survey_responses")
    .select("id", { count: "exact", head: true })
    .eq("survey_id", id);

  const { data: responses } = await supabase
    .from("survey_responses")
    .select("id, user_id, answers, submitted_at, profiles(full_name, email)")
    .eq("survey_id", id)
    .order("submitted_at", { ascending: false });

  return NextResponse.json({ data: { ...survey, response_count: count ?? 0, responses: responses ?? [] } });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;
  const { id } = await params;

  const body = await request.json() as Record<string, unknown>;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.title === "string") updates.title = body.title.trim();
  if (typeof body.description === "string") updates.description = body.description.trim() || null;
  if (typeof body.type === "string") updates.type = body.type;
  if (typeof body.status === "string") updates.status = body.status;
  if (typeof body.cohort_id === "string") updates.cohort_id = body.cohort_id;
  if (Array.isArray(body.questions)) updates.questions = body.questions;

  const { data, error } = await supabase
    .from("surveys")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;
  const { id } = await params;

  const { error } = await supabase.from("surveys").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: null });
}
