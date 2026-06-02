import { authError, authOk, isErrorResponse, readJsonBody } from "@/lib/auth/api-response";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { parseSignupBody } from "@/lib/auth/request-body";
import { signUpWithEmail } from "@/lib/auth/signup";

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (isErrorResponse(parsed)) return parsed;

  const input = parseSignupBody(parsed.body);
  if (!input) {
    return authError("Invalid signup request.", 400);
  }

  const result = await signUpWithEmail(input);

  if (!result.ok) {
    return authError(
      result.message,
      result.code === "email_exists" ? 409 : 400,
      result.code,
    );
  }

  return authOk({
    ok: true as const,
    redirectTo: AUTH_ROUTES.pendingApproval,
  });
}
