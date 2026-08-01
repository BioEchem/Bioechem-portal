import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { AdminCohortForm } from "@/components/admin/admin-cohort-form";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New cohort" };

type SchoolOption = { id: string; name: string };

export default async function AdminCohortNewPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string }>;
}) {
  const { schoolId } = await searchParams;

  const { supabase, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "approval_status, role, school_id",
  });

  const isBioAdmin = profile.role === "bioechem_admin";
  if (!isBioAdmin) notFound();

  const { data: schoolData } = await supabase
    .from("schools")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  const schools: SchoolOption[] = schoolData ?? [];
  const presetSchoolId = schoolId ?? undefined;

  return (
    <PortalPage title="New cohort" description="Create a new cohort or class">
      <div className="space-y-4">
        <Link
          href="/admin/cohorts"
          className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ChevronLeft className="h-4 w-4" /> Back to cohorts
        </Link>

        <PortalCard>
          <AdminCohortForm
            cohort={null}
            schools={schools}
            isBioAdmin={isBioAdmin}
            presetSchoolId={presetSchoolId}
          />
        </PortalCard>
      </div>
    </PortalPage>
  );
}
