import { notifyAllAdmins } from "@/lib/notifications/create";
import { emailAdminCohortEnrollment } from "@/lib/notify/admin-email";
import type { SupabaseAdmin, SupabaseServer } from "@/lib/supabase/types";

export type EnrollResult =
  | { ok: true; status: "pending" | "approved" }
  | { ok: false; message: string; status: 400 | 404 | 409 };

/**
 * Creates (or reactivates) a cohort_enrollments row for a user, mirroring the
 * pending/approved logic used by POST /api/cohorts/[id]/enroll. Shared so that
 * profile completion (optional cohort selection) and the explicit enroll
 * button behave identically.
 */
export async function enrollUserInCohort(
  supabase: SupabaseServer,
  admin: SupabaseAdmin,
  userId: string,
  role: "participant" | "teacher",
  cohortId: string,
  who: string,
): Promise<EnrollResult> {
  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, name, status, is_active, max_enrollment, enrollment_requires_approval")
    .eq("id", cohortId)
    .single();

  if (!cohort || !cohort.is_active || cohort.status !== "active") {
    return { ok: false, message: "Cohort is not available.", status: 404 };
  }

  const { data: existing } = await admin
    .from("cohort_enrollments")
    .select("id, status")
    .eq("cohort_id", cohortId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "dropped") {
      const newStatus = cohort.enrollment_requires_approval ? "pending" : "approved";
      const { error } = await admin
        .from("cohort_enrollments")
        .update({ status: newStatus, enrolled_at: new Date().toISOString(), reviewed_at: null, reviewed_by: null })
        .eq("id", existing.id);
      if (error) return { ok: false, message: error.message, status: 400 };
      return { ok: true, status: newStatus };
    }
    return { ok: true, status: existing.status as "pending" | "approved" };
  }

  if (cohort.max_enrollment != null) {
    const { count } = await supabase
      .from("cohort_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("cohort_id", cohortId)
      .eq("status", "approved");

    if ((count ?? 0) >= cohort.max_enrollment) {
      return { ok: false, message: "This cohort is full.", status: 409 };
    }
  }

  const enrollmentStatus = cohort.enrollment_requires_approval ? "pending" : "approved";

  const { error } = await supabase.from("cohort_enrollments").insert({
    cohort_id: cohortId,
    user_id: userId,
    role,
    status: enrollmentStatus,
  });

  if (error) return { ok: false, message: error.message, status: 400 };

  if (cohort.enrollment_requires_approval) {
    void notifyAllAdmins({
      type: "general",
      title: "Cohort enrollment pending approval",
      body: `${who} requested to join "${cohort.name}".`,
      link: `/admin/cohorts/${cohortId}`,
    });
    emailAdminCohortEnrollment(who, cohort.name, cohortId);
  }

  return { ok: true, status: enrollmentStatus };
}
