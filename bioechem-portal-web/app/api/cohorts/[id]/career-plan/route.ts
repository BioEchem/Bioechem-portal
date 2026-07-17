import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

async function getEnrollment(supabase: Awaited<ReturnType<typeof createClient>>, cohortId: string, userId: string) {
  const { data } = await supabase
    .from("cohort_enrollments")
    .select("role, status")
    .eq("cohort_id", cohortId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

async function canManageCohort(supabase: Awaited<ReturnType<typeof createClient>>, cohortId: string, userId: string) {
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (profile?.role === "bioechem_admin" || profile?.role === "school_admin") return true;
  const enrollment = await getEnrollment(supabase, cohortId, userId);
  return enrollment?.role === "teacher" && enrollment?.status === "approved";
}

// GET: participant gets their own entry; ?all=1 (managers only) gets everyone's.
export async function GET(req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId } = await params;
  const wantsAll = new URL(req.url).searchParams.get("all") === "1";

  if (wantsAll) {
    if (!(await canManageCohort(supabase, cohortId, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const admin = createServiceRoleClient() ?? supabase;
    const { data, error } = await admin
      .from("career_updates")
      .select("id, user_id, content, file_url, file_name, size_bytes, mime_type, updated_at, profiles!user_id(full_name, email)")
      .eq("cohort_id", cohortId)
      .order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  }

  const enrollment = await getEnrollment(supabase, cohortId, user.id);
  if (enrollment?.role !== "participant" || enrollment?.status !== "approved") {
    return NextResponse.json({ error: "Only enrolled participants can view this." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("career_updates")
    .select("id, content, file_url, file_name, size_bytes, mime_type, updated_at")
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// PUT: participant creates/updates their own text content.
export async function PUT(req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId } = await params;

  const enrollment = await getEnrollment(supabase, cohortId, user.id);
  if (enrollment?.role !== "participant" || enrollment?.status !== "approved") {
    return NextResponse.json({ error: "Only enrolled participants can update this." }, { status: 403 });
  }

  const body = await req.json() as { content?: unknown };
  const content = typeof body.content === "string" ? body.content.trim() : "";

  const { data, error } = await supabase
    .from("career_updates")
    .upsert(
      { cohort_id: cohortId, user_id: user.id, content: content || null, updated_at: new Date().toISOString() },
      { onConflict: "cohort_id,user_id" },
    )
    .select("id, content, file_url, file_name, size_bytes, mime_type, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
