import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { emailUserEnrollmentDecision } from "@/lib/notify/user-email";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approval_status, school_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.approval_status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Fetch enrollment with its role so we can apply correct permission rules
  const { data: enrollment } = await supabase
    .from("cohort_enrollments")
    .select("id, cohort_id, user_id, role, status")
    .eq("id", id)
    .single();

  if (!enrollment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isBioAdmin = profile.role === "bioechem_admin";
  const isSchoolAdmin = profile.role === "school_admin";

  // Fetch the cohort's school so we can check school_admin ownership
  const { data: cohort } = await supabase
    .from("cohorts")
    .select("school_id")
    .eq("id", enrollment.cohort_id)
    .single();

  const isSchoolAdminOfCohort =
    isSchoolAdmin &&
    !!profile.school_id &&
    cohort?.school_id === profile.school_id;

  let canReview = false;

  if (enrollment.role === "teacher") {
    // Teacher enrollments: only bioechem_admin or the school's school_admin may review
    canReview = isBioAdmin || isSchoolAdminOfCohort;
  } else {
    // Participant enrollments: bioechem_admin, school_admin of the cohort's school,
    // or an approved teacher in that cohort (but not reviewing their own enrollment)
    if (isBioAdmin || isSchoolAdminOfCohort) {
      canReview = true;
    } else if (enrollment.user_id !== user.id) {
      const { data: teacherEnrollment } = await supabase
        .from("cohort_enrollments")
        .select("id")
        .eq("cohort_id", enrollment.cohort_id)
        .eq("user_id", user.id)
        .eq("role", "teacher")
        .eq("status", "approved")
        .maybeSingle();
      canReview = !!teacherEnrollment;
    }
  }

  if (!canReview) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as Record<string, unknown>;
  const newStatus = typeof body.status === "string" ? body.status : "";

  // "approved" | "rejected" — rejected covers both initial rejection and revoke
  if (!["approved", "rejected"].includes(newStatus)) {
    return NextResponse.json({ error: "status must be approved or rejected" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("cohort_enrollments")
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      rejection_reason:
        newStatus === "rejected" && typeof body.rejectionReason === "string"
          ? body.rejectionReason.trim() || null
          : null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Notify the user of the enrollment decision (fire-and-forget)
  void (async () => {
    const db = createServiceRoleClient();
    if (!db) return;
    const [profileRes, cohortRes] = await Promise.all([
      db.from("profiles").select("email, full_name").eq("id", enrollment.user_id).single(),
      db.from("cohorts").select("title").eq("id", enrollment.cohort_id).single(),
    ]);
    const email = profileRes.data?.email as string | null;
    if (!email) return;
    const name = (profileRes.data?.full_name as string | null) ?? email;
    const cohortName = (cohortRes.data?.title as string | null) ?? "your cohort";
    const reason = newStatus === "rejected" && typeof body.rejectionReason === "string"
      ? body.rejectionReason.trim() || null
      : null;
    emailUserEnrollmentDecision(email, name, cohortName, newStatus === "approved", reason, enrollment.cohort_id);
  })();

  return NextResponse.json({ data });
}
