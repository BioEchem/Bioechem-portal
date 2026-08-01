import {
  authError,
  authOk,
  isErrorResponse,
  readJsonBody,
} from "@/lib/auth/api-response";
import { changePassword } from "@/lib/auth/password";
import { parsePasswordChangeBody } from "@/lib/auth/request-body";
import { requireApprovedUser } from "@/lib/profile/require-approved-user";

export async function PATCH(request: Request) {
  const session = await requireApprovedUser();
  if (!session.ok) return session.response;

  const parsed = await readJsonBody(request);
  if (isErrorResponse(parsed)) return parsed;

  const input = parsePasswordChangeBody(parsed.body);
  if (!input) {
    return authError("Current password and new password are required.", 400);
  }

  const {
    data: { user },
  } = await session.supabase.auth.getUser();

  if (!user?.email) {
    return authError("Could not verify your account.", 400);
  }

  const result = await changePassword(
    user.email,
    input.currentPassword,
    input.newPassword,
  );

  if (!result.ok) {
    return authError(result.message, 400);
  }

  return authOk({ ok: true as const });
}
