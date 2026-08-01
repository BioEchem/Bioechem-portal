import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const { data } = await supabase
    .from("survey_responses")
    .select("id, answers, submitted_at")
    .eq("survey_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ data });
}

export async function POST(request: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const { data: survey } = await supabase
    .from("surveys")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (!survey) return NextResponse.json({ error: "Survey not found." }, { status: 404 });
  if (survey.status !== "active") return NextResponse.json({ error: "Survey is not accepting responses." }, { status: 403 });

  const existing = await supabase
    .from("survey_responses")
    .select("id")
    .eq("survey_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing.data) return NextResponse.json({ error: "Already submitted." }, { status: 409 });

  const body = await request.json() as { answers: Record<string, unknown> };
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};

  const { data, error } = await supabase
    .from("survey_responses")
    .insert({ survey_id: id, user_id: user.id, answers })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
