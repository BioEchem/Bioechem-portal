import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const sessionExpired = reason === "session_expired";

  return (
    <AuthCard
      title="Log in"
      footer={
        <div className="space-y-2">
          <p>
            Don&apos;t have an account?{" "}
            <Link href={AUTH_ROUTES.signup} className="font-medium text-bio-green hover:underline">
              Create account
            </Link>
          </p>
          <p>
            <Link
              href={AUTH_ROUTES.forgotPassword}
              className="font-medium text-bio-green hover:underline"
            >
              Forgot password?
            </Link>
          </p>
        </div>
      }
    >
      {sessionExpired && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your session has expired. Please log in again.
        </div>
      )}
      <LoginForm />
    </AuthCard>
  );
}
