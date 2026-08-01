import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth/session";
import { SurveyTaker } from "@/components/surveys/survey-taker";
import type { SurveyQuestion } from "@/components/admin/survey-form";

type Survey = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  questions: SurveyQuestion[];
  cohorts: { name: string } | null;
};

type SurveyResponse = {
  id: string;
  answers: Record<string, unknown>;
  submitted_at: string;
} | null;

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireSession({ requireApproved: true });

  const { data: survey } = await supabase
    .from("surveys")
    .select("id, title, description, type, status, questions, cohorts(name)")
    .eq("id", id)
    .maybeSingle<Survey>();

  if (!survey) notFound();

  const { data: existingResponse } = await supabase
    .from("survey_responses")
    .select("id, answers, submitted_at")
    .eq("survey_id", id)
    .eq("user_id", user.id)
    .maybeSingle<SurveyResponse>();

  return (
    <SurveyTaker
      survey={survey}
      existingResponse={existingResponse ?? null}
    />
  );
}
