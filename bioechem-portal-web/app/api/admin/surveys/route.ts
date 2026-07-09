import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("surveys")
    .select("id, title, description, type, status, created_at, updated_at, cohort_id, cohorts(id, name)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;
  const { supabase, adminUserId } = auth;

  const body = await request.json() as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const cohort_id = typeof body.cohort_id === "string" ? body.cohort_id : null;

  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!cohort_id) return NextResponse.json({ error: "Cohort is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("surveys")
    .insert({
      title,
      cohort_id,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      type: typeof body.type === "string" ? body.type : "custom",
      status: typeof body.status === "string" ? body.status : "draft",
      questions: Array.isArray(body.questions) ? body.questions : [],
      created_by: adminUserId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
