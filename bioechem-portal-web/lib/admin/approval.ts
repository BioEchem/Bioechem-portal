import type { ApprovalProfile, ApprovalRequestBody } from "@/lib/admin/types";
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
    .select("id, approval_status")
    .eq("id", targetUserId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, message: fetchError.message, status: 400 };
  }

  if (!existing) {
    return { ok: false, message: "User not found.", status: 404 };
  }

  if (existing.approval_status !== "pending") {
    return { ok: false, message: "User is not pending approval.", status: 409 };
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
