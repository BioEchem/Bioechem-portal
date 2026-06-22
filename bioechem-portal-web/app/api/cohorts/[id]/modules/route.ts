import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

async function getManagerStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  cohortId: string,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approval_status, school_id")
    .eq("id", userId)
    .single();

  if (!profile || profile.approval_status !== "approved") return { canManage: false, isEnrolled: false };

  if (profile.role === "bioechem_admin") return { canManage: true, isEnrolled: false };

  if (profile.role === "school_admin" && profile.school_id) {
    const { data: cohort } = await supabase.from("cohorts").select("school_id").eq("id", cohortId).single();
    if (cohort?.school_id === profile.school_id) return { canManage: true, isEnrolled: false };
  }

  const { data: enrollment } = await supabase
    .from("cohort_enrollments")
    .select("role, status")
    .eq("cohort_id", cohortId)
    .eq("user_id", userId)
    .maybeSingle();

  const isEnrolled = enrollment?.status === "approved";
  const canManage = enrollment?.role === "teacher" && enrollment?.status === "approved";
  return { canManage, isEnrolled };
}

export async function GET(_req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId } = await params;
  const { canManage, isEnrolled } = await getManagerStatus(supabase, user.id, cohortId);

  if (!canManage && !isEnrolled) {
    return NextResponse.json({ error: "Not enrolled." }, { status: 403 });
  }

  let query = supabase
    .from("modules")
    .select("id, title, description, position, published, publish_at, created_at, updated_at")
    .eq("cohort_id", cohortId)
    .order("position");

  if (!canManage) query = query.eq("published", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId } = await params;
  const { canManage } = await getManagerStatus(supabase, user.id, cohortId);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

  // Get max position
  const { data: last } = await supabase
    .from("modules")
    .select("position")
    .eq("cohort_id", cohortId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("modules")
    .insert({
      cohort_id: cohortId,
      title,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      position: (last?.position ?? -1) + 1,
      published: body.published === true,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
