import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { requireSession } from "@/lib/auth/session";
import type { SurveyQuestion } from "@/components/admin/survey-form";
import { DeleteSurveyButton } from "@/components/admin/delete-survey-button";

export const metadata: Metadata = { title: "Survey Detail" };

type SurveyResponse = {
  id: string;
  user_id: string;
  answers: Record<string, unknown>;
  submitted_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

type Survey = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  questions: SurveyQuestion[];
  cohorts: { name: string } | null;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = { halfway: "Halfway", final: "Final", custom: "Custom" };
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "—";
  return String(value);
}

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireSession({
    requireApproved: true,
    requiredRole: "bioechem_admin",
  });

  const { data: survey } = await supabase
    .from("surveys")
    .select("*, cohorts(name)")
    .eq("id", id)
    .maybeSingle<Survey>();

  if (!survey) notFound();

  type RawResponse = { id: string; user_id: string; answers: Record<string, unknown>; submitted_at: string };
  const { data: rawResponses, count } = await supabase
    .from("survey_responses")
    .select("id, user_id, answers, submitted_at", { count: "exact" })
    .eq("survey_id", id)
    .order("submitted_at", { ascending: false })
    .returns<RawResponse[]>();

  const raw = rawResponses ?? [];

  // Fetch profiles for all respondents (FK is to auth.users, not profiles, so manual join)
  const userIds = [...new Set(raw.map((r) => r.user_id))];
  const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    for (const p of profiles ?? []) profileMap.set(p.id, { full_name: p.full_name, email: p.email });
  }

  const responseList: SurveyResponse[] = raw.map((r) => ({
    ...r,
    profiles: profileMap.get(r.user_id) ?? null,
  }));

  return (
    <PortalPage title={survey.title}>
      <div className="space-y-4">
        {/* Info card */}
        <PortalCard>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[survey.status] ?? ""}`}>
                  {survey.status}
                </span>
                <span className="rounded-full bg-bio-mint px-2 py-0.5 text-xs font-medium text-bio-green">
                  {TYPE_LABEL[survey.type] ?? survey.type}
                </span>
              </div>
              <p className="text-sm text-bio-text-muted">
                Cohort: <span className="text-bio-text">{survey.cohorts?.name ?? "—"}</span>
              </p>
              {survey.description ? (
                <p className="text-sm text-bio-text-muted">{survey.description}</p>
              ) : null}
              <p className="text-sm text-bio-text-muted">
                {count ?? 0} response{count === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/admin/surveys/${id}/edit`}
                className="rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium text-bio-text-muted hover:bg-bio-mint/30"
              >
                Edit
              </Link>
              <DeleteSurveyButton surveyId={id} />
            </div>
          </div>
        </PortalCard>

        {/* Questions */}
        <PortalCard>
          <h2 className="mb-3 text-sm font-semibold text-bio-text">
            Questions ({survey.questions.length})
          </h2>
          {survey.questions.length === 0 ? (
            <p className="text-sm text-bio-text-muted">No questions defined.</p>
          ) : (
            <ol className="space-y-3">
              {survey.questions.map((q, i) => (
                <li key={q.id} className="text-sm">
                  <span className="font-medium text-bio-text">
                    {i + 1}. {q.text}
                  </span>
                  <span className="ml-2 text-xs text-bio-text-muted">({q.type}{q.required ? ", required" : ""})</span>
                  {q.options.length > 0 ? (
                    <ul className="mt-1 ml-4 list-disc space-y-0.5 text-bio-text-muted">
                      {q.options.map((o) => <li key={o}>{o}</li>)}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </PortalCard>

        {/* Responses */}
        <PortalCard>
          <h2 className="mb-3 text-sm font-semibold text-bio-text">
            Responses ({count ?? 0})
          </h2>
          {responseList.length === 0 ? (
            <p className="text-sm text-bio-text-muted">No responses yet.</p>
          ) : (
            <div className="space-y-4">
              {responseList.map((resp) => (
                <div key={resp.id} className="rounded-lg border border-card-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-bio-text">
                      {resp.profiles?.full_name ?? resp.profiles?.email ?? resp.user_id}
                    </p>
                    <p className="text-xs text-bio-text-muted">
                      {new Date(resp.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {survey.questions.map((q) => (
                      <div key={q.id} className="text-xs">
                        <span className="text-bio-text-muted">{q.text}: </span>
                        <span className="text-bio-text">{formatAnswer(resp.answers[q.id])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PortalCard>
      </div>
    </PortalPage>
  );
}
