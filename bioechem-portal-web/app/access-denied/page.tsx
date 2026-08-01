import type { Metadata } from "next";

import { SiteHeader } from "@/components/brand/site-header";
import { BackToLoginButton } from "@/components/auth/back-to-login-button";
import { requireRejectedSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Access denied",
};

export default async function AccessDeniedPage() {
  const { user, profile } = await requireRejectedSession();
  const rejectionReason = profile.rejection_reason?.trim();

  return (
    <>
    <SiteHeader />
    <main className="bio-pattern flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-card-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold text-bio-green">Access denied</h1>

        <p className="mt-4 text-sm leading-relaxed text-bio-text-muted">
          {user.email ? (
            <>
              A BioEchem admin has rejected the portal access request for{" "}
              <span className="font-medium text-bio-text">{user.email}</span>.
            </>
          ) : (
            "A BioEchem admin has rejected your portal access request."
          )}
        </p>

        {rejectionReason ? (
          <div className="mx-auto mt-4 max-w-xs rounded-lg border border-card-border bg-bio-mint/50 px-4 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-bio-text-muted">
              Note from admin
            </p>
            <p className="mt-2 text-sm leading-relaxed text-bio-text">{rejectionReason}</p>
          </div>
        ) : null}

        <p className="mt-4 text-center text-sm text-bio-text-muted">
          If you believe this is a mistake, contact{" "}
          <a
            href="mailto:team@bioechem.com"
            className="font-medium text-bio-green hover:underline"
          >
            team@bioechem.com
          </a>
          .
        </p>

        <div className="mt-8 flex justify-center">
          <BackToLoginButton className="bio-btn-secondary inline-flex disabled:cursor-not-allowed disabled:opacity-60" />
        </div>
      </div>
    </main>
    </>
  );
}
