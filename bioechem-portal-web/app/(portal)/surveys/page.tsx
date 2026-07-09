import type { Metadata } from "next";
import Link from "next/link";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Surveys" };

type SurveyItem = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  cohort_id: string;
  cohorts: { name: string } | null;
  already_responded: boolean;
};

const TYPE_LABEL: Record<string, string> = { halfway: "Halfway", final: "Final", custom: "Custom" };

export default async function SurveysPage() {
  const { supabase, user } = await requireSession({ requireApproved: true });

  const { data: enrollments } = await supabase
    .from("cohort_enrollments")
    .select("cohort_id")
    .eq("user_id", user.id)
    .eq("status", "approved");

  const cohortIds = (enrollments ?? []).map((e: { cohort_id: string }) => e.cohort_id);

  let surveys: SurveyItem[] = [];

  if (cohortIds.length > 0) {
    const { data: activeSurveys } = await supabase
      .from("surveys")
      .select("id, title, description, type, cohort_id, cohorts(name)")
      .eq("status", "active")
      .in("cohort_id", cohortIds)
      .order("created_at", { ascending: false })
      .returns<Omit<SurveyItem, "already_responded">[]>();

    if (activeSurveys && activeSurveys.length > 0) {
      const { data: myResponses } = await supabase
        .from("survey_responses")
        .select("survey_id")
        .eq("user_id", user.id);

      const respondedIds = new Set(
        (myResponses ?? []).map((r: { survey_id: string }) => r.survey_id)
      );

      surveys = activeSurveys.map((s) => ({
        ...s,
        already_responded: respondedIds.has(s.id),
      }));
    }
  }

  const available = surveys.filter((s) => !s.already_responded);
  const completed = surveys.filter((s) => s.already_responded);

  return (
    <PortalPage title="Surveys" description="Surveys from your enrolled cohorts.">
      <div className="space-y-4">
        <PortalCard>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-green">
            Available ({available.length})
          </h2>
          {available.length === 0 ? (
            <p className="text-sm text-bio-text-muted">No pending surveys.</p>
          ) : (
            <div className="divide-y divide-card-border">
              {available.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3 gap-3">
                  <div>
                    <p className="text-sm font-medium text-bio-text">{s.title}</p>
                    <p className="text-xs text-bio-text-muted mt-0.5">
                      {s.cohorts?.name ?? "—"} · {TYPE_LABEL[s.type] ?? s.type}
                    </p>
                  </div>
                  <Link
                    href={`/surveys/${s.id}`}
                    className="rounded-lg bg-bio-green px-3 py-1.5 text-xs font-medium text-white hover:bg-bio-green/90 shrink-0"
                  >
                    Take survey
                  </Link>
                </div>
              ))}
            </div>
          )}
        </PortalCard>

        {completed.length > 0 && (
          <PortalCard>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-text-muted">
              Completed ({completed.length})
            </h2>
            <div className="divide-y divide-card-border">
              {completed.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3 gap-3">
                  <div>
                    <p className="text-sm font-medium text-bio-text">{s.title}</p>
                    <p className="text-xs text-bio-text-muted mt-0.5">
                      {s.cohorts?.name ?? "—"} · {TYPE_LABEL[s.type] ?? s.type}
                    </p>
                  </div>
                  <Link
                    href={`/surveys/${s.id}`}
                    className="text-xs text-bio-text-muted hover:text-bio-green shrink-0"
                  >
                    View response
                  </Link>
                </div>
              ))}
            </div>
          </PortalCard>
        )}
      </div>
    </PortalPage>
  );
}
