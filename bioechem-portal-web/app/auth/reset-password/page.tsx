import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Set new password",
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthCard title="Link expired">
        <div className="space-y-4 text-center">
          <p className="text-sm text-bio-text-muted">
            This password reset link is invalid or has already been used. Please request a new
            one.
          </p>
          <Link
            href={AUTH_ROUTES.forgotPassword}
            className="bio-btn-primary mt-2 inline-block w-full text-center"
          >
            Request new link
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set new password"
      description="Choose a strong password of at least 6 characters."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
