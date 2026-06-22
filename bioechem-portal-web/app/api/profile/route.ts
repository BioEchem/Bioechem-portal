import {
  authError,
  authOk,
  isErrorResponse,
  readJsonBody,
} from "@/lib/auth/api-response";
import { parseUpdateProfileBody } from "@/lib/profile/request-body";
import { requireApprovedUser } from "@/lib/profile/require-approved-user";
import { updateOwnProfile } from "@/lib/profile/update";

export async function PATCH(request: Request) {
  const session = await requireApprovedUser();
  if (!session.ok) return session.response;

  const parsed = await readJsonBody(request);
  if (isErrorResponse(parsed)) return parsed;

  const input = parseUpdateProfileBody(parsed.body);
  if (!input) {
    return authError("Invalid profile update request.", 400);
  }

  const result = await updateOwnProfile(
    session.supabase,
    session.userId,
    session.role,
    input,
  );

  if (!result.ok) {
    return authError(result.message, result.status);
  }

  return authOk({
    ok: true as const,
    section: result.section,
  });
}
