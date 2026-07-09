import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { SurveyForm } from "@/components/admin/survey-form";
import { requireSession } from "@/lib/auth/session";
import type { SurveyQuestion } from "@/components/admin/survey-form";

export const metadata: Metadata = { title: "Edit Survey" };

type Survey = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  cohort_id: string | null;
  questions: SurveyQuestion[];
};

export default async function EditSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireSession({
    requireApproved: true,
    requiredRole: "bioechem_admin",
  });

  const [{ data: survey }, { data: cohorts }] = await Promise.all([
    supabase
      .from("surveys")
      .select("id, title, description, type, status, cohort_id, questions")
      .eq("id", id)
      .maybeSingle<Survey>(),
    supabase.from("cohorts").select("id, name").eq("status", "active").order("name"),
  ]);

  if (!survey) notFound();

  return (
    <PortalPage title="Edit Survey">
      <PortalCard>
        <SurveyForm
          initialData={{
            id: survey.id,
            title: survey.title,
            description: survey.description ?? "",
            type: survey.type,
            status: survey.status,
            cohort_id: survey.cohort_id ?? "",
            questions: survey.questions,
          }}
          cohorts={cohorts ?? []}
        />
      </PortalCard>
    </PortalPage>
  );
}
