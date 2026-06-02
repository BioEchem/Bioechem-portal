import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/brand/sign-out-button";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "School",
};

export default async function SchoolHubPage() {
  const { supabase, user, profile } = await requireSession({
    profileSelect: "approval_status, role, school_id, schools ( name )",
    requireApproved: true,
    requiredRole: "school_admin",
  });

  if (!profile.school_id) {
    redirect(AUTH_ROUTES.dashboard);
  }

  const school = profile.schools;
  const schoolName = Array.isArray(school) ? school[0]?.name : school?.name;

  const { count: memberCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("school_id", profile.school_id)
    .neq("role", "bioechem_admin");

  return (
    <main className="bio-pattern flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-xl border border-card-border bg-card p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold text-bio-green">School admin</h1>
        <p className="mt-2 text-sm text-bio-text-muted">
          Signed in as <span className="font-medium text-bio-text">{user.email}</span>
        </p>

        <div className="mt-6 rounded-lg border border-bio-mint bg-bio-mint/40 px-4 py-3 text-sm text-bio-text">
          <p>
            <span className="font-medium">Partner school:</span>{" "}
            {schoolName ?? "Your school"}
          </p>
          <p className="mt-2">
            <span className="font-medium">Portal members at your school:</span>{" "}
            {memberCount ?? 0}
          </p>
        </div>

        <p className="mt-4 text-sm text-bio-text-muted">
          You can view members affiliated with your school. Roster management and
          cohort tools will be added here next.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href={AUTH_ROUTES.dashboard} className="bio-btn-secondary inline-flex">
            Dashboard
          </Link>
          <SignOutButton className="bio-btn-secondary inline-flex" />
        </div>
      </div>
    </main>
  );
}
