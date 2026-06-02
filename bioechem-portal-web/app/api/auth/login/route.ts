import { authError, authOk, isErrorResponse, readJsonBody } from "@/lib/auth/api-response";
import { signInWithEmailPassword } from "@/lib/auth/login";
import { resolveLoginRedirect } from "@/lib/auth/post-login-redirect";
import { parseLoginBody } from "@/lib/auth/request-body";

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (isErrorResponse(parsed)) return parsed;

  const credentials = parseLoginBody(parsed.body);
  if (!credentials?.email || !credentials.password) {
    return authError("Email and password are required.", 400);
  }

  const result = await signInWithEmailPassword(
    credentials.email,
    credentials.password,
  );

  if (!result.ok) {
    return authError(result.message, 401);
  }

  return authOk({
    ok: true as const,
    redirectTo: await resolveLoginRedirect(),
  });
}
