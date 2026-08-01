"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, RotateCcw } from "lucide-react";
import type { QuizAnswers, QuizQuestion } from "@/lib/quiz/types";

type ExistingSubmission = {
  id: string;
  answers: QuizAnswers;
  auto_score: number;
  manual_score: number | null;
  needs_grading: boolean;
  feedback: string | null;
  submitted_at: string;
} | null;

function ResultSummary({
  submission,
  maxPoints,
}: {
  submission: NonNullable<ExistingSubmission>;
  maxPoints: number;
}) {
  const totalScore = submission.auto_score + (submission.manual_score ?? 0);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-green-700">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span>
          Submitted on{" "}
          {new Date(submission.submitted_at).toLocaleString("en-US", {
            month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
          })}
        </span>
      </div>
      <div className="rounded-lg border border-card-border bg-bio-surface px-4 py-3">
        {submission.needs_grading ? (
          <p className="text-sm text-amber-700">
            Auto-graded questions: {submission.auto_score} pts. Short-answer questions are pending manual grading.
          </p>
        ) : (
          <p className="text-2xl font-bold text-bio-green">
            {totalScore} / {maxPoints}
          </p>
        )}
      </div>
      {submission.feedback ? (
        <p className="rounded-lg bg-bio-mint/20 p-3 text-sm text-bio-text">{submission.feedback}</p>
      ) : null}
    </div>
  );
}

export function QuizTakeForm({
  cohortId,
  quizId,
  questions,
  maxPoints,
  existingSubmission,
  isOverdue,
}: {
  cohortId: string;
  quizId: string;
  questions: QuizQuestion[];
  maxPoints: number;
  existingSubmission: ExistingSubmission;
  isOverdue: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<QuizAnswers>(existingSubmission?.answers ?? {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showRetake, setShowRetake] = useState(false);

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to submit."); return; }
      setSuccess(true);
      setShowRetake(false);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (isOverdue) {
    return (
      <div className="space-y-3">
        {existingSubmission ? <ResultSummary submission={existingSubmission} maxPoints={maxPoints} /> : (
          <p className="text-sm text-bio-text-muted">The deadline has passed. No submission was made.</p>
        )}
        <p className="text-xs text-bio-text-muted italic">Submissions are closed — the due date has passed.</p>
      </div>
    );
  }

  if (existingSubmission && !showRetake) {
    return (
      <div className="space-y-3">
        <ResultSummary submission={existingSubmission} maxPoints={maxPoints} />
        <button
          type="button"
          onClick={() => setShowRetake(true)}
          className="inline-flex items-center gap-1.5 text-xs text-bio-text-muted hover:text-bio-green"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retake
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5">
      {showRetake && (
        <p className="text-xs text-amber-600">You are replacing your previous answers.</p>
      )}

      {questions.map((q, i) => (
        <div key={q.id} className="space-y-2">
          <p className="text-sm font-medium text-bio-text">
            {i + 1}. {q.text} <span className="text-xs font-normal text-bio-text-muted">({q.points} pts)</span>
          </p>

          {q.type === "multiple_choice" ? (
            <div className="space-y-1.5">
              {(q.options ?? []).filter(Boolean).map((opt) => (
                <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm text-bio-text">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswer(q.id, opt)}
                    className="h-4 w-4 accent-bio-green"
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : null}

          {q.type === "true_false" ? (
            <div className="flex gap-4">
              {["true", "false"].map((v) => (
                <label key={v} className="flex cursor-pointer items-center gap-1.5 text-sm text-bio-text">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === v}
                    onChange={() => setAnswer(q.id, v)}
                    className="h-4 w-4 accent-bio-green"
                  />
                  {v === "true" ? "True" : "False"}
                </label>
              ))}
            </div>
          ) : null}

          {q.type === "short_answer" ? (
            <textarea
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              rows={3}
              placeholder="Your answer…"
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text placeholder:text-bio-text-muted focus:outline-none focus:ring-2 focus:ring-bio-green/50"
            />
          ) : null}
        </div>
      ))}

      {error ? <p className="text-sm text-red-500" role="alert">{error}</p> : null}
      {success ? (
        <p className="flex items-center gap-2 text-sm text-bio-green">
          <CheckCircle className="h-4 w-4" /> Submitted successfully!
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-bio-green px-5 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-40"
        >
          {loading ? "Submitting…" : showRetake ? "Resubmit" : "Submit quiz"}
        </button>
        {showRetake && (
          <button
            type="button"
            onClick={() => setShowRetake(false)}
            className="rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
