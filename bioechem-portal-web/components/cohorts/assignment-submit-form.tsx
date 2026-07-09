"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle, FileText, RotateCcw } from "lucide-react";

type ExistingSubmission = {
  id: string;
  submission_text: string | null;
  file_url: string | null;
  filename: string | null;
  submitted_at: string;
} | null;

export function AssignmentSubmitForm({
  cohortId,
  assignmentId,
  submissionType,
  existingSubmission,
  isOverdue,
}: {
  cohortId: string;
  assignmentId: string;
  submissionType: string;
  existingSubmission: ExistingSubmission;
  isOverdue: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(existingSubmission?.submission_text ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showResubmit, setShowResubmit] = useState(false);

  const isText = submissionType === "text" || submissionType === "any";
  const isFile = submissionType === "file" || submissionType === "any";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let fileUrl: string | null = existingSubmission?.file_url ?? null;
      let filename: string | null = existingSubmission?.filename ?? null;

      if (file) {
        const form = new FormData();
        form.append("file", file);
        const ur = await fetch(`/api/cohorts/${cohortId}/assignments/${assignmentId}/upload`, { method: "POST", body: form });
        if (!ur.ok) {
          const uj = await ur.json() as { error?: string };
          setError(uj.error ?? "File upload failed.");
          return;
        }
        const uj = await ur.json() as { url: string; filename: string };
        fileUrl = uj.url;
        filename = uj.filename;
      }

      const body: Record<string, unknown> = {};
      if (isText) body.submission_text = text.trim() || null;
      if (isFile && fileUrl) { body.file_url = fileUrl; body.filename = filename; }

      const res = await fetch(`/api/cohorts/${cohortId}/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to submit."); return; }
      setSuccess(true);
      setShowResubmit(false);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  // Past due — show what was submitted (or nothing), no form
  if (isOverdue) {
    return (
      <div className="space-y-3">
        {existingSubmission ? (
          <>
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>
                Submitted on{" "}
                {new Date(existingSubmission.submitted_at).toLocaleString("en-US", {
                  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
                })}
              </span>
            </div>
            {existingSubmission.submission_text && (
              <div className="rounded-lg border border-card-border bg-bio-surface px-4 py-3 text-sm text-bio-text whitespace-pre-wrap">
                {existingSubmission.submission_text}
              </div>
            )}
            {existingSubmission.filename && existingSubmission.file_url && (
              <a
                href={existingSubmission.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-bio-green hover:underline"
              >
                <FileText className="h-4 w-4" />
                {existingSubmission.filename}
              </a>
            )}
          </>
        ) : (
          <p className="text-sm text-bio-text-muted">
            The deadline has passed. No submission was made.
          </p>
        )}
        <p className="text-xs text-bio-text-muted italic">Submissions are closed — the due date has passed.</p>
      </div>
    );
  }

  // Not overdue, already submitted — show submission + collapsed resubmit option
  if (existingSubmission && !showResubmit) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>
            Submitted on{" "}
            {new Date(existingSubmission.submitted_at).toLocaleString("en-US", {
              month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
            })}
          </span>
        </div>

        {existingSubmission.submission_text && (
          <div className="rounded-lg border border-card-border bg-bio-surface px-4 py-3 text-sm text-bio-text whitespace-pre-wrap">
            {existingSubmission.submission_text}
          </div>
        )}
        {existingSubmission.filename && existingSubmission.file_url && (
          <a
            href={existingSubmission.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-bio-green hover:underline"
          >
            <FileText className="h-4 w-4" />
            {existingSubmission.filename}
          </a>
        )}

        <button
          type="button"
          onClick={() => setShowResubmit(true)}
          className="inline-flex items-center gap-1.5 text-xs text-bio-text-muted hover:text-bio-green"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Resubmit
        </button>
      </div>
    );
  }

  // No submission yet (or resubmit open) — show the form
  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      {showResubmit && (
        <p className="text-xs text-amber-600">
          You are replacing your previous submission.
        </p>
      )}

      {isText ? (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-bio-text-muted uppercase tracking-wide">
            {submissionType === "any" ? "Text response" : "Your response"}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Write your response here…"
            className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text placeholder:text-bio-text-muted focus:outline-none focus:ring-2 focus:ring-bio-green/50"
          />
        </div>
      ) : null}

      {isFile ? (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-bio-text-muted uppercase tracking-wide">
            {submissionType === "any" ? "File attachment" : "Upload file"}
          </label>
          <div
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-card-border p-6 hover:border-bio-green/40"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-6 w-6 text-bio-text-muted" />
            <p className="text-sm text-bio-text-muted">
              {file ? file.name : "Click to choose a file"}
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      ) : null}

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
          {loading ? "Submitting…" : showResubmit ? "Resubmit" : "Submit"}
        </button>
        {showResubmit && (
          <button
            type="button"
            onClick={() => setShowResubmit(false)}
            className="rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
