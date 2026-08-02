import { authError, authOk, isErrorResponse, readJsonBody } from "@/lib/auth/api-response";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { parseSignupBody } from "@/lib/auth/request-body";
import { signUpWithEmail } from "@/lib/auth/signup";
import { notifyAllAdmins } from "@/lib/notifications/create";
import { emailAdminNewSignup } from "@/lib/notify/admin-email";
import { getRoleLabel } from "@/lib/profile/display";

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

  if (result.needsEmailConfirmation) {
    // No session was established (email confirmation required) and we can't
    // tell whether this was a brand-new signup or an already-registered
    // email — don't notify admins or redirect into a session-gated page,
    // just tell the user to check their inbox.
    return authOk({ ok: true as const, needsEmailConfirmation: true as const });
  }

  const fullName = `${input.firstName} ${input.lastName}`;
  const roleLabel = getRoleLabel(input.role);

  // Fire-and-forget: in-app notification to all admins + email to admin inbox
  void notifyAllAdmins({
    type: "general",
    title: "New user pending approval",
    body: `${fullName} (${input.email}) signed up as ${roleLabel}.`,
    link: AUTH_ROUTES.adminApprovals,
  });
  emailAdminNewSignup(fullName, input.email, roleLabel);

  return authOk({
    ok: true as const,
    redirectTo: AUTH_ROUTES.pendingApproval,
  });
}
