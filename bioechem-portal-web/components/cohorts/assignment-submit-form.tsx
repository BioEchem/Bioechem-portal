"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle } from "lucide-react";

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
}: {
  cohortId: string;
  assignmentId: string;
  submissionType: string;
  existingSubmission: ExistingSubmission;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(existingSubmission?.submission_text ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        const uploadPath = `/api/cohorts/${cohortId}/assignments/${assignmentId}/upload`;
        const ur = await fetch(uploadPath, { method: "POST", body: form });
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
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      {existingSubmission ? (
        <p className="text-xs text-bio-text-muted">
          Last submitted:{" "}
          {new Date(existingSubmission.submitted_at).toLocaleString("en-US", {
            month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
          })}
        </p>
      ) : null}

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
          {existingSubmission?.filename ? (
            <p className="mb-2 text-sm text-bio-text-muted">
              Current file: <span className="text-bio-text">{existingSubmission.filename}</span>
            </p>
          ) : null}
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

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-bio-green px-5 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-40"
      >
        {loading ? "Submitting…" : existingSubmission ? "Update submission" : "Submit"}
      </button>
    </form>
  );
}
