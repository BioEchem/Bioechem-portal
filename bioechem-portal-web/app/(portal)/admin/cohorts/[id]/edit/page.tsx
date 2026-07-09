import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { AdminCohortForm } from "@/components/admin/admin-cohort-form";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Edit cohort" };

type SchoolOption = { id: string; name: string };

export default async function AdminCohortEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { supabase, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "approval_status, role, school_id",
  });

  const isBioAdmin = profile.role === "bioechem_admin";
  const isSchoolAdmin = profile.role === "school_admin";
  if (!isBioAdmin && !isSchoolAdmin) notFound();

  let schools: SchoolOption[] = [];
  if (isBioAdmin) {
    const { data } = await supabase
      .from("schools")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    schools = data ?? [];
  }

  const [{ data: cohort }, { data: contacts }] = await Promise.all([
    supabase
      .from("cohorts")
      .select("id, name, description, school_id, status, is_active, start_date, end_date, max_enrollment, enrollment_requires_approval")
      .eq("id", id)
      .single(),
    supabase
      .from("cohort_contacts")
      .select("id, name, email, title, position")
      .eq("cohort_id", id)
      .order("position"),
  ]);

  if (!cohort) notFound();

  if (isSchoolAdmin && !isBioAdmin) {
    const adminProfile = profile as typeof profile & { school_id: string | null };
    if ((cohort as Record<string, unknown>).school_id !== adminProfile.school_id) notFound();
  }

  const cohortName = (cohort as Record<string, unknown>).name as string;

  return (
    <PortalPage title="Edit cohort" description={cohortName}>
      <div className="space-y-4">
        <Link
          href={`/admin/cohorts/${id}`}
          className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ChevronLeft className="h-4 w-4" /> Back to cohort overview
        </Link>

        <PortalCard>
          <AdminCohortForm
            cohort={{ ...cohort, cohort_contacts: contacts ?? [] }}
            schools={schools}
            isBioAdmin={isBioAdmin}
          />
        </PortalCard>
      </div>
    </PortalPage>
  );
}
