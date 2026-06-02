import { authError, authOk } from "@/lib/auth/api-response";
import { signOut } from "@/lib/auth/logout";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export async function POST() {
  const result = await signOut();

  if (!result.ok) {
    return authError(result.message, 500);
  }

  return authOk({
    ok: true as const,
    redirectTo: AUTH_ROUTES.home,
  });
}
