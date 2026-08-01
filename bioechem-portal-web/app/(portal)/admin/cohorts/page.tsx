import type { Metadata } from "next";
import Link from "next/link";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { AdminCohortsTable } from "@/components/admin/admin-cohorts-table";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Cohorts" };

type CohortRow = {
  id: string;
  name: string;
  status: string;
  max_enrollment: number | null;
  enrollment_requires_approval: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  schools: { id: string; name: string } | null;
};

export default async function AdminCohortsPage() {
  const { supabase, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "approval_status, role, school_id",
  });

  const isBioAdmin = profile.role === "bioechem_admin";
  const isSchoolAdmin = profile.role === "school_admin";

  if (!isBioAdmin && !isSchoolAdmin) {
    return (
      <PortalPage title="Cohorts">
        <PortalCard>
          <p className="text-sm text-bio-text-muted">Access denied.</p>
        </PortalCard>
      </PortalPage>
    );
  }

  const schoolAdminProfile = profile as typeof profile & { school_id: string | null };
  if (isSchoolAdmin && !isBioAdmin && !schoolAdminProfile.school_id) {
    // A school admin must be linked to a school — never fall back to an
    // unfiltered query, which would leak every school's cohorts.
    return (
      <PortalPage title="Cohorts">
        <PortalCard>
          <p className="text-sm text-bio-text-muted">
            Your account isn&apos;t linked to a school yet. Contact BioEchem support.
          </p>
        </PortalCard>
      </PortalPage>
    );
  }

  let query = supabase
    .from("cohorts")
    .select("id, name, status, max_enrollment, enrollment_requires_approval, start_date, end_date, created_at, schools(id, name)")
    .order("name");

  if (isSchoolAdmin && !isBioAdmin) {
    query = query.eq("school_id", schoolAdminProfile.school_id as string);
  }

  const { data: cohorts } = await query.returns<CohortRow[]>();
  const rows = cohorts ?? [];

  const active = rows.filter((c) => c.status === "active");
  const draft = rows.filter((c) => c.status === "draft");
  const archived = rows.filter((c) => c.status === "archived");

  return (
    <PortalPage
      title="Cohorts"
      description="Manage classes and cohorts. Control enrollment settings and capacity."
    >
      <div className="space-y-4">
        {isBioAdmin ? (
          <div className="flex justify-end">
            <Link
              href="/admin/cohorts/new"
              className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90"
            >
              + Add cohort
            </Link>
          </div>
        ) : null}

        {draft.length > 0 ? (
          <PortalCard>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-text-muted">
                Draft
              </h2>
              <span className="text-xs text-bio-text-muted">{draft.length}</span>
            </div>
            <AdminCohortsTable rows={draft} showSchool={isBioAdmin} />
          </PortalCard>
        ) : null}

        <PortalCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
              Active
            </h2>
            <span className="text-xs text-bio-text-muted">{active.length} cohorts</span>
          </div>
          <AdminCohortsTable rows={active} showSchool={isBioAdmin} />
        </PortalCard>

        {archived.length > 0 ? (
          <PortalCard>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-text-muted">
                Archived
              </h2>
              <span className="text-xs text-bio-text-muted">{archived.length}</span>
            </div>
            <AdminCohortsTable rows={archived} showSchool={isBioAdmin} />
          </PortalCard>
        ) : null}
      </div>
    </PortalPage>
  );
}
