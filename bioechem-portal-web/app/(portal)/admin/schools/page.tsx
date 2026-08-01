import type { Metadata } from "next";
import Link from "next/link";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { AdminSchoolsTable } from "@/components/admin/admin-schools-table";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Schools" };

type SchoolRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  is_partner: boolean;
  is_active: boolean;
  created_at: string;
};

export default async function AdminSchoolsPage() {
  const { supabase } = await requireSession({
    requireApproved: true,
    requiredRole: "bioechem_admin",
  });

  const { data: schools } = await supabase
    .from("schools")
    .select("id, name, city, state, country, is_partner, is_active, created_at")
    .order("name")
    .returns<SchoolRow[]>();

  const rows = schools ?? [];
  const active = rows.filter((s) => s.is_active);
  const inactive = rows.filter((s) => !s.is_active);

  return (
    <PortalPage
      title="Schools"
      description="Manage partner schools. Schools can have cohorts and associated users."
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <Link
            href="/admin/schools/new"
            className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90"
          >
            + Add school
          </Link>
        </div>

        <PortalCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
              Active schools
            </h2>
            <span className="text-xs text-bio-text-muted">{active.length} schools</span>
          </div>
          <AdminSchoolsTable rows={active} />
        </PortalCard>

        {inactive.length > 0 ? (
          <PortalCard>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-text-muted">
                Inactive schools
              </h2>
              <span className="text-xs text-bio-text-muted">{inactive.length}</span>
            </div>
            <AdminSchoolsTable rows={inactive} />
          </PortalCard>
        ) : null}
      </div>
    </PortalPage>
  );
}
