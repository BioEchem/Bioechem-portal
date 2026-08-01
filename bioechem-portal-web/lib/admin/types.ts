/** JSON shapes for `/api/admin/*` routes. */

export type ApprovalAction = "approve" | "reject";

export type ApprovalRequestBody = {
  action: ApprovalAction;
  rejectionReason?: string | null;
};

export type ApprovalProfile = {
  id: string;
  approval_status: "approved" | "rejected";
  approved_at: string | null;
  rejection_reason: string | null;
};

export type ApprovalSuccessResponse = {
  ok: true;
  profile: ApprovalProfile;
};
