import { PortalShell } from "@/components/portal/portal-shell";
import { requireSession, type ApprovalStatus } from "@/lib/auth/session";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import type { ProfileCompletionFields } from "@/lib/profile/completion";
import { needsOnboarding } from "@/lib/profile/onboarding";
import { PORTAL_PROFILE_COMPLETION_SELECT } from "@/lib/portal/profile-select";
import { redirect } from "next/navigation";

type PortalLayoutProfile = ProfileCompletionFields & {
  approval_status: ApprovalStatus | null;
  role: string | null;
  full_name: string | null;
  email: string | null;
};

export default async function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, profile } = await requireSession<PortalLayoutProfile>({
    requireApproved: true,
    profileSelect: `approval_status, role, full_name, email, ${PORTAL_PROFILE_COMPLETION_SELECT}`,
  });

  if (needsOnboarding(profile)) {
    redirect(AUTH_ROUTES.completeProfile);
  }

  return (
    <PortalShell
      userName={profile.full_name}
      userEmail={user.email ?? profile.email}
      userRole={profile.role}
    >
      {children}
    </PortalShell>
  );
}
