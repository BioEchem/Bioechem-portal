"use client";

import { useState } from "react";
import { CheckCircle, ChevronDown, ChevronUp, Link as LinkIcon } from "lucide-react";
import { formatShortDateTime as fmt } from "@/lib/format/date";

type SubmissionRow = {
  id: string;
  user_id: string;
  submission_text: string | null;
  file_url: string | null;
  filename: string | null;
  link_url: string | null;
  submitted_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
  grades: { points_earned: number | null; feedback: string | null; graded_at: string } | null;
};

type GradeState = { points_earned: number | null; feedback: string | null; graded_at: string };

function SubmissionCard({
  cohortId,
  submission: init,
  maxPoints,
}: {
  cohortId: string;
  submission: SubmissionRow;
  maxPoints: number;
}) {
  const [submission, setSubmission] = useState(init);
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(init.grades == null);
  const [points, setPoints] = useState<string>(
    submission.grades?.points_earned != null ? String(submission.grades.points_earned) : "",
  );
  const [feedback, setFeedback] = useState(submission.grades?.feedback ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function startEdit() {
    setPoints(submission.grades?.points_earned != null ? String(submission.grades.points_earned) : "");
    setFeedback(submission.grades?.feedback ?? "");
    setError(null);
    setSaved(false);
    setIsEditing(true);
  }

  function cancelEdit() {
    setPoints(submission.grades?.points_earned != null ? String(submission.grades.points_earned) : "");
    setFeedback(submission.grades?.feedback ?? "");
    setError(null);
    setIsEditing(false);
  }

  async function saveGrade(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/grades/${submission.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points_earned: points !== "" ? parseFloat(points) : null,
          feedback: feedback.trim() || null,
        }),
      });
      const json = await res.json() as { data?: GradeState; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to save."); return; }
      if (json.data) {
        setSubmission((prev) => ({ ...prev, grades: json.data! }));
      }
      setSaved(true);
      setIsEditing(false);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  const grade = submission.grades;
  const name = submission.profiles?.full_name ?? submission.profiles?.email ?? "Unknown";
  const pct =
    grade?.points_earned != null && maxPoints > 0
      ? Math.round((grade.points_earned / maxPoints) * 100)
      : null;

  return (
    <div className="rounded-xl border border-card-border bg-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4"
      >
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="font-medium text-bio-text">{name}</p>
            <p className="text-xs text-bio-text-muted">{fmt(submission.submitted_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {grade ? (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                pct != null && pct >= 70 ? "bg-bio-green/10 text-bio-green" : "bg-red-50 text-red-500"
              }`}
            >
              <CheckCircle className="h-3 w-3" />
              {grade.points_earned ?? "—"} / {maxPoints}
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Ungraded
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-bio-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-bio-text-muted" />
          )}
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-card-border p-4 space-y-4">
          {submission.submission_text ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-bio-text-muted">
                Response
              </p>
              <p className="whitespace-pre-wrap text-sm text-bio-text">{submission.submission_text}</p>
            </div>
          ) : null}

          {submission.file_url ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-bio-text-muted">
                File
              </p>
              <a
                href={submission.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-bio-green hover:underline"
              >
                {submission.filename ?? "Download file"}
              </a>
            </div>
          ) : null}

          {submission.link_url ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-bio-text-muted">
                Link
              </p>
              <a
                href={submission.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-bio-green hover:underline"
              >
                <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{submission.link_url}</span>
              </a>
            </div>
          ) : null}

          {!isEditing && grade ? (
            <div className="space-y-3 border-t border-card-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-bio-text-muted">Grade</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-bio-text">
                  {grade.points_earned ?? "—"} / {maxPoints}
                </span>
                {pct != null ? <span className="text-sm text-bio-text-muted">({pct}%)</span> : null}
              </div>
              {grade.feedback ? (
                <p className="whitespace-pre-wrap text-sm text-bio-text-muted">{grade.feedback}</p>
              ) : (
                <p className="text-sm text-bio-text-muted/60 italic">No feedback given.</p>
              )}
              {saved ? <p className="text-sm text-bio-green">Grade saved.</p> : null}
              <button
                type="button"
                onClick={startEdit}
                className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-bio-text hover:border-bio-green/40 hover:text-bio-green"
              >
                Update grade
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void saveGrade(e)} className="space-y-3 border-t border-card-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-bio-text-muted">Grade</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={maxPoints}
                  step="0.5"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="Points"
                  className="w-24 rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text focus:outline-none focus:ring-2 focus:ring-bio-green/50"
                />
                <span className="text-sm text-bio-text-muted">/ {maxPoints}</span>
                {pct != null ? (
                  <span className="text-sm text-bio-text-muted">({pct}%)</span>
                ) : null}
              </div>
              <textarea
                placeholder="Feedback (optional)"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text placeholder:text-bio-text-muted focus:outline-none focus:ring-2 focus:ring-bio-green/50"
              />
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-40"
                >
                  {loading ? "Saving…" : grade ? "Save changes" : "Save grade"}
                </button>
                {grade ? (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={loading}
                    className="rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text disabled:opacity-40"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function SubmissionsReviewList({
  cohortId,
  submissions,
  maxPoints,
}: {
  cohortId: string;
  submissions: SubmissionRow[];
  maxPoints: number;
}) {
  if (submissions.length === 0) {
    return <p className="text-sm text-bio-text-muted">No submissions yet.</p>;
  }

  const graded = submissions.filter((s) => s.grades != null).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-bio-text-muted">
        {graded} / {submissions.length} graded
      </p>
      {submissions.map((sub) => (
        <SubmissionCard
          key={sub.id}
          cohortId={cohortId}
          submission={sub}
          maxPoints={maxPoints}
        />
      ))}
    </div>
  );
}
