import type { ApprovalAction, ApprovalRequestBody } from "@/lib/admin/types";

const APPROVAL_ACTIONS = new Set<ApprovalAction>(["approve", "reject"]);

export function parseApprovalBody(body: unknown): ApprovalRequestBody | null {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const action = record.action;

  if (typeof action !== "string" || !APPROVAL_ACTIONS.has(action as ApprovalAction)) {
    return null;
  }

  const rejectionReason =
    record.rejectionReason === null || record.rejectionReason === undefined
      ? null
      : typeof record.rejectionReason === "string"
        ? record.rejectionReason.trim() || null
        : null;

  return {
    action: action as ApprovalAction,
    rejectionReason,
  };
}
