import type { ApprovalProfile, ApprovalRequestBody } from "@/lib/admin/types";
import { enrollUserInCohort } from "@/lib/cohorts/enroll";
import type { SupabaseServer } from "@/lib/supabase/types";

export type UpdateApprovalResult =
  | { ok: true; profile: ApprovalProfile }
  | { ok: false; message: string; status: 400 | 404 | 409 };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUserId(value: string): boolean {
  return UUID_RE.test(value);
}

/** Approve or reject a pending user profile (BioEchem admin, RLS-enforced). */
export async function updateUserApproval(
  supabase: SupabaseServer,
  adminUserId: string,
  targetUserId: string,
  input: ApprovalRequestBody,
): Promise<UpdateApprovalResult> {
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("id, approval_status, role, cohort_id, full_name, email")
    .eq("id", targetUserId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, message: fetchError.message, status: 400 };
  }

  if (!existing) {
    return { ok: false, message: "User not found.", status: 404 };
  }

  // Approving is also how a mistaken rejection gets reversed, so allow it
  // from "pending" or "rejected". Rejecting only makes sense from "pending".
  const allowedFrom = input.action === "approve" ? ["pending", "rejected"] : ["pending"];
  if (!allowedFrom.includes(existing.approval_status)) {
    return {
      ok: false,
      message:
        input.action === "approve"
          ? "User is already approved."
          : "User is not pending approval.",
      status: 409,
    };
  }

  const now = new Date().toISOString();

  if (input.action === "approve") {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        approval_status: "approved",
        approved_at: now,
        approved_by: adminUserId,
        rejection_reason: null,
        updated_at: now,
      })
      .eq("id", targetUserId)
      .select("id, approval_status, approved_at, rejection_reason")
      .maybeSingle<ApprovalProfile>();

    if (error) {
      return { ok: false, message: error.message, status: 400 };
    }

    if (!data) {
      return { ok: false, message: "Could not update user.", status: 400 };
    }

    // A participant/teacher who picked a cohort at signup only has
    // profiles.cohort_id set so far — turn that into a real enrollment now
    // that they're approved. Don't fail the approval itself if this errors.
    if (
      (existing.role === "participant" || existing.role === "teacher") &&
      existing.cohort_id
    ) {
      const who = existing.full_name?.trim() || existing.email || "A user";
      const enrollResult = await enrollUserInCohort(
        supabase,
        supabase,
        targetUserId,
        existing.role,
        existing.cohort_id,
        who,
      );
      if (!enrollResult.ok) {
        console.error(
          `Failed to auto-enroll approved user ${targetUserId} into cohort ${existing.cohort_id}: ${enrollResult.message}`,
        );
      }
    }

    return { ok: true, profile: data };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      approval_status: "rejected",
      approved_at: null,
      approved_by: null,
      rejection_reason: input.rejectionReason,
      updated_at: now,
    })
    .eq("id", targetUserId)
    .select("id, approval_status, approved_at, rejection_reason")
    .maybeSingle<ApprovalProfile>();

  if (error) {
    return { ok: false, message: error.message, status: 400 };
  }

  if (!data) {
    return { ok: false, message: "Could not update user.", status: 400 };
  }

  return { ok: true, profile: data };
}
