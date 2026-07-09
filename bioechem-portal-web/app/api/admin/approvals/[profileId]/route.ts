import {
  authError,
  authOk,
  isErrorResponse,
  readJsonBody,
} from "@/lib/auth/api-response";
import { isValidUserId, updateUserApproval } from "@/lib/admin/approval";
import { parseApprovalBody } from "@/lib/admin/request-body";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { emailUserApproved, emailUserRejected } from "@/lib/notify/user-email";

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

  // Fire-and-forget email notification to the affected user
  void (async () => {
    const { data } = await admin.supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", profileId)
      .single();
    if (!data?.email) return;
    const name = (data.full_name as string | null) ?? data.email as string;
    if (input.action === "approve") {
      emailUserApproved(data.email as string, name);
    } else {
      emailUserRejected(data.email as string, name, input.rejectionReason ?? null);
    }
  })();

  return authOk({
    ok: true as const,
    profile: result.profile,
  });
}
