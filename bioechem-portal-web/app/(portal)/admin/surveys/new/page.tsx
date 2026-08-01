import type { Metadata } from "next";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { SurveyForm } from "@/components/admin/survey-form";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New Survey" };

export default async function NewSurveyPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort_id?: string; cohort_name?: string }>;
}) {
  const { supabase } = await requireSession({
    requireApproved: true,
    requiredRole: "bioechem_admin",
  });

  const { cohort_id: defaultCohortId } = await searchParams;

  const { data: cohorts } = await supabase
    .from("cohorts")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  return (
    <PortalPage title="New Survey">
      <PortalCard>
        <SurveyForm cohorts={cohorts ?? []} defaultCohortId={defaultCohortId} />
      </PortalCard>
    </PortalPage>
  );
}
