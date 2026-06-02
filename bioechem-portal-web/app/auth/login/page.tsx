import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Log in"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href={AUTH_ROUTES.signup}
            className="font-medium text-bio-green hover:underline"
          >
            Create account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
