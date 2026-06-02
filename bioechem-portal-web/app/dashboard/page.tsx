import type { Metadata } from "next";

import { redirectRoleHome, requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { user, profile } = await requireSession({ requireApproved: true });
  redirectRoleHome(profile);

  return (
    <main className="bio-pattern flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-xl border border-card-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold text-bio-green">Dashboard</h1>
        <p className="mt-2 text-sm text-bio-text-muted">
          Signed in as <span className="font-medium text-bio-text">{user.email}</span>
        </p>
        <p className="mt-4 text-sm text-bio-text-muted">
          Portal pages will be added here next.
        </p>
      </div>
    </main>
  );
}
