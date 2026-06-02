import type { Metadata } from "next";

import { SignOutButton } from "@/components/brand/sign-out-button";
import { requirePendingApprovalSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Pending approval",
};

export default async function PendingApprovalPage() {
  const { user, profile } = await requirePendingApprovalSession();
  const isAdminSignup = profile.role === "bioechem_admin";

  return (
    <main className="bio-pattern flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-xl border border-card-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold text-bio-green">
          {isAdminSignup ? "Admin access pending" : "Pending approval"}
        </h1>

        {isAdminSignup ? (
          <>
            <p className="mt-3 text-sm text-bio-text-muted">
              Thanks for registering, {user.email}. Your admin account was created
              but is not active yet.
            </p>
            <p className="mt-4 rounded-lg border border-bio-mint bg-bio-mint/40 px-4 py-3 text-left text-sm text-bio-text">
              Ask an existing BioEchem administrator to
              approve you as an admin in the backend to use admin features.
            </p>
            {/* <p className="mt-4 text-sm text-bio-text-muted">
              First admin on a new project? Run the promotion SQL in Supabase — see{" "}
              <code className="rounded bg-muted px-1 text-xs">docs/AUTH_AND_APPROVAL.md</code>
              .
            </p> */}
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-bio-text-muted">
              Thanks for registering, {user.email}. A BioEchem admin will verify your
              {profile.role === "school_admin"
                ? " school admin request and partner school"
                : profile.role === "industry_partner" ||
                    profile.role === "shareholder"
                  ? " account"
                  : " school affiliation"}{" "}
              before you can access the portal.
            </p>
            <p className="mt-4 text-sm text-bio-text-muted">
              You can sign out and check back later, or contact{" "}
              <a
                href="mailto:team@bioechem.com"
                className="font-medium text-bio-green hover:underline"
              >
                team@bioechem.com
              </a>
              .
            </p>
          </>
        )}

        <div className="mt-6 flex justify-center">
          <SignOutButton className="bio-btn-secondary inline-flex" />
        </div>
      </div>
    </main>
  );
}
