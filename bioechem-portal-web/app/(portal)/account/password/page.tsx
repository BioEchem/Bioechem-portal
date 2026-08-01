import type { Metadata } from "next";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { PasswordChangeForm } from "@/components/profile/password-change-form";

export const metadata: Metadata = {
  title: "Change password",
};

export default function AccountPasswordPage() {
  return (
    <PortalPage
      title="Password"
      description="Update the password you use to sign in to the portal."
    >
      <PortalCard>
        <PasswordChangeForm />
      </PortalCard>
    </PortalPage>
  );
}
