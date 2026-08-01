import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Reset password",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const linkExpired = error === "link_expired";

  return (
    <AuthCard
      title="Reset password"
      description="Enter your email and we'll send you a link to reset your password."
      footer={
        <Link href={AUTH_ROUTES.login} className="font-medium text-bio-green hover:underline">
          Back to log in
        </Link>
      }
    >
      <ForgotPasswordForm linkExpiredError={linkExpired} />
    </AuthCard>
  );
}
