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

async function getManagerRole(supabase: Awaited<ReturnType<typeof createClient>>, cohortId: string, userId: string) {
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (profile?.role === "bioechem_admin" || profile?.role === "school_admin") return "admin" as const;
  const enrollment = await getEnrollment(supabase, cohortId, userId);
  if (enrollment?.role === "teacher" && enrollment?.status === "approved") return "teacher" as const;
  return null;
}

// GET: participant gets their own entry; ?all=1 (managers only) gets the cohort's feedback.
// Admins/school admins see who submitted what; teachers see ratings/comments only (anonymized).
export async function GET(req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId } = await params;
  const wantsAll = new URL(req.url).searchParams.get("all") === "1";

  if (wantsAll) {
    const managerRole = await getManagerRole(supabase, cohortId, user.id);
    if (!managerRole) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const admin = createServiceRoleClient() ?? supabase;

    if (managerRole === "admin") {
      const { data, error } = await admin
        .from("cohort_feedback")
        .select("id, user_id, rating, comment, created_at, profiles!user_id(full_name, email)")
        .eq("cohort_id", cohortId)
        .order("created_at", { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: data ?? [], anonymized: false });
    }

    // Teacher: same rows, no submitter identity.
    const { data, error } = await admin
      .from("cohort_feedback")
      .select("id, rating, comment, created_at")
      .eq("cohort_id", cohortId)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [], anonymized: true });
  }

  const enrollment = await getEnrollment(supabase, cohortId, user.id);
  if (enrollment?.role !== "participant" || enrollment?.status !== "approved") {
    return NextResponse.json({ error: "Only enrolled participants can view this." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("cohort_feedback")
    .select("id, rating, comment, created_at, updated_at")
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// PUT: participant creates/updates their own rating + comment. Open any time during the cohort.
export async function PUT(req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId } = await params;

  const enrollment = await getEnrollment(supabase, cohortId, user.id);
  if (enrollment?.role !== "participant" || enrollment?.status !== "approved") {
    return NextResponse.json({ error: "Only enrolled participants can leave feedback." }, { status: 403 });
  }

  const body = await req.json() as { rating?: unknown; comment?: unknown };
  const rating = typeof body.rating === "number" ? Math.round(body.rating) : NaN;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be an integer from 1 to 5." }, { status: 400 });
  }
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  const { data, error } = await supabase
    .from("cohort_feedback")
    .upsert(
      { cohort_id: cohortId, user_id: user.id, rating, comment: comment || null, updated_at: new Date().toISOString() },
      { onConflict: "cohort_id,user_id" },
    )
    .select("id, rating, comment, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
