import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { enrollUserInCohort } from "@/lib/cohorts/enroll";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approval_status, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile || profile.approval_status !== "approved") {
    return NextResponse.json({ error: "Account not approved." }, { status: 403 });
  }
  if (!["participant", "teacher"].includes(profile.role)) {
    return NextResponse.json({ error: "Admins do not enroll in cohorts." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });

  const who = profile.full_name?.trim() || profile.email || "A user";
  const result = await enrollUserInCohort(
    supabase,
    admin,
    user.id,
    profile.role as "participant" | "teacher",
    cohortId,
    who,
  );

  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

  return NextResponse.json({ requiresApproval: result.status === "pending" }, { status: 201 });
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
