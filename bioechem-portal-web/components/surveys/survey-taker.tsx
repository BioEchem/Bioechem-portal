"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import type { SurveyQuestion } from "@/components/admin/survey-form";
import { SurveyQuestionInput } from "@/components/surveys/survey-question";

type Survey = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  questions: SurveyQuestion[];
  cohorts: { name: string } | null;
};

type ExistingResponse = {
  id: string;
  answers: Record<string, unknown>;
  submitted_at: string;
} | null;

const TYPE_LABEL: Record<string, string> = { halfway: "Halfway", final: "Final", custom: "Custom" };

export function SurveyTaker({ survey, existingResponse }: { survey: Survey; existingResponse: ExistingResponse }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>(existingResponse?.answers ?? {});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingResponse);
  const [error, setError] = useState<string | null>(null);

  function setAnswer(qId: string, value: unknown) {
    setAnswers((a) => ({ ...a, [qId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/surveys/${survey.id}/response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });

    const json = await res.json() as { error?: string };
    setSubmitting(false);

    if (!res.ok) {
      setError(json.error ?? "Failed to submit.");
      return;
    }

    setSubmitted(true);
  }

  const readOnly = submitted || survey.status !== "active";

  return (
    <PortalPage
      title={survey.title}
      description={survey.description ?? `${TYPE_LABEL[survey.type] ?? survey.type} survey · ${survey.cohorts?.name ?? ""}`}
    >
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/surveys")}
          className="flex items-center gap-1.5 text-sm text-bio-text-muted hover:text-bio-green"
        >
          ← Back to Surveys
        </button>
        {submitted && (
          <PortalCard>
            <p className="text-sm font-medium text-bio-green">
              {existingResponse ? "You already submitted this survey." : "Response submitted. Thank you!"}
            </p>
            {existingResponse?.submitted_at && (
              <p className="text-xs text-bio-text-muted mt-1">
                Submitted on {new Date(existingResponse.submitted_at).toLocaleDateString()}
              </p>
            )}
          </PortalCard>
        )}

        {survey.status !== "active" && !existingResponse && (
          <PortalCard>
            <p className="text-sm text-bio-text-muted">This survey is not currently accepting responses.</p>
          </PortalCard>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {survey.questions.map((q, i) => (
              <PortalCard key={q.id}>
                <p className="mb-3 text-sm font-medium text-bio-text">
                  {i + 1}. {q.text}
                  {q.required && <span className="ml-1 text-red-500">*</span>}
                </p>
                <SurveyQuestionInput
                  question={q}
                  value={answers[q.id]}
                  onChange={(v) => setAnswer(q.id, v)}
                  readOnly={readOnly}
                />
              </PortalCard>
            ))}
          </div>

          {!readOnly && survey.questions.length > 0 && (
            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-bio-green px-5 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit response"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/surveys")}
                className="rounded-lg border border-card-border px-5 py-2 text-sm font-medium text-bio-text-muted hover:bg-bio-mint/30"
              >
                Back
              </button>
            </div>
          )}
        </form>

        {survey.questions.length === 0 && (
          <PortalCard>
            <p className="text-sm text-bio-text-muted">This survey has no questions yet.</p>
          </PortalCard>
        )}
      </div>
    </PortalPage>
  );
}
