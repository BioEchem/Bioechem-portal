import {
  authError,
  authOk,
  isErrorResponse,
  readJsonBody,
} from "@/lib/auth/api-response";
import { isValidUserId, updateUserApproval } from "@/lib/admin/approval";
import { parseApprovalBody } from "@/lib/admin/request-body";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const admin = await requireBioechemAdmin();
  if (!admin.ok) return admin.response;

  const { profileId } = await params;
  if (!isValidUserId(profileId)) {
    return authError("Invalid profile id.", 400);
  }

  const parsed = await readJsonBody(request);
  if (isErrorResponse(parsed)) return parsed;

  const input = parseApprovalBody(parsed.body);
  if (!input) {
    return authError('Body must include action: "approve" or "reject".', 400);
  }

  const result = await updateUserApproval(
    admin.supabase,
    admin.adminUserId,
    profileId,
    input,
  );

  if (!result.ok) {
    return authError(result.message, result.status);
  }

  return authOk({
    ok: true as const,
    profile: result.profile,
  });
}
