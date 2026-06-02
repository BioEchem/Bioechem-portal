import type { Metadata } from "next";
import Link from "next/link";

import { AUTH_ROUTES } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Access denied",
};

export default function AccessDeniedPage() {
  return (
    <main className="bio-pattern flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-xl border border-card-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold text-bio-green">Access denied</h1>
        <p className="mt-3 text-sm text-bio-text-muted">
          Your portal access was not approved or has been revoked. Contact{" "}
          <a
            href="mailto:team@bioechem.com"
            className="font-medium text-bio-green hover:underline"
          >
            team@bioechem.com
          </a>{" "}
          if you believe this is a mistake.
        </p>
        <Link href={AUTH_ROUTES.login} className="bio-btn-secondary mt-6 inline-flex">
          Back to log in
        </Link>
      </div>
    </main>
  );
}
