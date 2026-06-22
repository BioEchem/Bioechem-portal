import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approval_status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.approval_status !== "approved") {
    return NextResponse.json({ error: "Account not approved." }, { status: 403 });
  }
  if (!["participant", "teacher"].includes(profile.role)) {
    return NextResponse.json({ error: "Admins do not enroll in cohorts." }, { status: 400 });
  }

  // Fetch cohort
  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, status, is_active, max_enrollment, enrollment_requires_approval")
    .eq("id", cohortId)
    .single();

  if (!cohort || !cohort.is_active || cohort.status !== "active") {
    return NextResponse.json({ error: "Cohort is not available." }, { status: 404 });
  }

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });

  // Check existing enrollment (use admin client — user may not have read access to dropped rows in all cases)
  const { data: existing } = await admin
    .from("cohort_enrollments")
    .select("id, status")
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "dropped") {
      // Re-enroll via admin client (RLS update policy only covers managers)
      const newStatus = cohort.enrollment_requires_approval ? "pending" : "approved";
      const { data, error } = await admin
        .from("cohort_enrollments")
        .update({ status: newStatus, enrolled_at: new Date().toISOString(), reviewed_at: null, reviewed_by: null })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ data });
    }
    return NextResponse.json({ error: "Already enrolled." }, { status: 409 });
  }

  // Capacity check
  if (cohort.max_enrollment != null) {
    const { count } = await supabase
      .from("cohort_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("cohort_id", cohortId)
      .eq("status", "approved");

    if ((count ?? 0) >= cohort.max_enrollment) {
      return NextResponse.json({ error: "This cohort is full." }, { status: 409 });
    }
  }

  const enrollmentStatus = cohort.enrollment_requires_approval ? "pending" : "approved";

  const { data, error } = await supabase
    .from("cohort_enrollments")
    .insert({
      cohort_id: cohortId,
      user_id: user.id,
      role: profile.role as "participant" | "teacher",
      status: enrollmentStatus,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, requiresApproval: cohort.enrollment_requires_approval }, { status: 201 });
}

export async function DELETE(_req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId } = await params;

  // RLS only allows managers to update enrollments, so use the admin client
  // to allow users to drop/cancel their own enrollment.
  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });

  const { error } = await admin
    .from("cohort_enrollments")
    .update({ status: "dropped" })
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .in("status", ["approved", "pending"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
