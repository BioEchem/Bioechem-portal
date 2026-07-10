"use client";

import { useState } from "react";
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { QuizAnswers, QuizQuestion } from "@/lib/quiz/types";

type SubmissionRow = {
  id: string;
  user_id: string;
  answers: QuizAnswers;
  auto_score: number;
  manual_score: number | null;
  needs_grading: boolean;
  feedback: string | null;
  submitted_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

function fmt(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function SubmissionCard({
  cohortId,
  quizId,
  questions,
  maxPoints,
  submission: init,
}: {
  cohortId: string;
  quizId: string;
  questions: QuizQuestion[];
  maxPoints: number;
  submission: SubmissionRow;
}) {
  const [submission, setSubmission] = useState(init);
  const [expanded, setExpanded] = useState(false);
  const [manualScore, setManualScore] = useState<string>(
    submission.manual_score != null ? String(submission.manual_score) : "",
  );
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function saveGrade(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/quizzes/${quizId}/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manual_score: manualScore !== "" ? parseFloat(manualScore) : null,
          feedback: feedback.trim() || null,
        }),
      });
      const json = await res.json() as { data?: SubmissionRow; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to save."); return; }
      if (json.data) setSubmission(json.data);
      setSaved(true);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  const name = submission.profiles?.full_name ?? submission.profiles?.email ?? "Unknown";
  const totalScore = submission.auto_score + (submission.manual_score ?? 0);
  const freeTextQuestions = questions.filter((q) => q.type === "short_answer");

  return (
    <div className="rounded-xl border border-card-border bg-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4"
      >
        <div className="text-left">
          <p className="font-medium text-bio-text">{name}</p>
          <p className="text-xs text-bio-text-muted">{fmt(submission.submitted_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          {submission.needs_grading ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Needs grading
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-bio-green/10 px-2 py-0.5 text-xs font-medium text-bio-green">
              <CheckCircle className="h-3 w-3" />
              {totalScore} / {maxPoints}
            </span>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-bio-text-muted" /> : <ChevronDown className="h-4 w-4 text-bio-text-muted" />}
        </div>
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-card-border p-4">
          {questions.map((q, i) => (
            <div key={q.id}>
              <p className="text-xs font-medium uppercase tracking-wide text-bio-text-muted">
                {i + 1}. {q.text} ({q.points} pts)
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-bio-text">
                {submission.answers[q.id] || <span className="text-bio-text-muted italic">No answer</span>}
              </p>
              {q.type !== "short_answer" && q.correctAnswer ? (
                <p className="mt-0.5 text-xs text-bio-text-muted">
                  Correct answer: <span className="text-bio-green">{q.correctAnswer}</span>
                </p>
              ) : null}
            </div>
          ))}

          {freeTextQuestions.length > 0 ? (
            <form onSubmit={(e) => void saveGrade(e)} className="space-y-3 border-t border-card-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-bio-text-muted">
                Grade short-answer questions
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={manualScore}
                  onChange={(e) => setManualScore(e.target.value)}
                  placeholder="Points"
                  className="w-24 rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text focus:outline-none focus:ring-2 focus:ring-bio-green/50"
                />
                <span className="text-sm text-bio-text-muted">
                  + {submission.auto_score} auto-graded = {(parseFloat(manualScore) || 0) + submission.auto_score} / {maxPoints}
                </span>
              </div>
              <textarea
                placeholder="Feedback (optional)"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text placeholder:text-bio-text-muted focus:outline-none focus:ring-2 focus:ring-bio-green/50"
              />
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              {saved ? <p className="text-sm text-bio-green">Grade saved.</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-40"
              >
                {loading ? "Saving…" : "Save grade"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function QuizSubmissionsReviewList({
  cohortId,
  quizId,
  questions,
  maxPoints,
  submissions,
}: {
  cohortId: string;
  quizId: string;
  questions: QuizQuestion[];
  maxPoints: number;
  submissions: SubmissionRow[];
}) {
  if (submissions.length === 0) {
    return <p className="text-sm text-bio-text-muted">No submissions yet.</p>;
  }

  const needsGrading = submissions.filter((s) => s.needs_grading).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-bio-text-muted">
        {submissions.length} submission{submissions.length === 1 ? "" : "s"}
        {needsGrading > 0 ? ` · ${needsGrading} need${needsGrading === 1 ? "s" : ""} grading` : ""}
      </p>
      {submissions.map((sub) => (
        <SubmissionCard
          key={sub.id}
          cohortId={cohortId}
          quizId={quizId}
          questions={questions}
          maxPoints={maxPoints}
          submission={sub}
        />
      ))}
    </div>
  );
}
