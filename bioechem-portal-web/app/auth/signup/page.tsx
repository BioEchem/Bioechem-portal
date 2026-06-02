import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <AuthCard
      title="Create account"
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={AUTH_ROUTES.login}
            className="font-medium text-bio-green hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
