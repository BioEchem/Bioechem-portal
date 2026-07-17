"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Upload, X } from "lucide-react";
import { QuizQuestionBuilder } from "@/components/cohorts/teacher/quiz-question-builder";
import type { QuizQuestion } from "@/lib/quiz/types";

type ItemType = "note" | "file" | "link" | "assignment" | "quiz";

const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: "note", label: "Note / Page" },
  { value: "file", label: "File / Slides" },
  { value: "link", label: "External Link" },
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
];

// Types that can carry an uploaded file (class slides, a PDF, assignment instructions, etc.)
const UPLOADABLE_TYPES: ItemType[] = ["note", "file", "assignment"];

const SUBMISSION_TYPES = [
  { value: "text", label: "Text response" },
  { value: "file", label: "File upload" },
  { value: "any", label: "Text + file" },
];

const ASSIGNMENT_TYPES = [
  { value: "assignment", label: "Assignment" },
  { value: "presentation", label: "Presentation" },
  { value: "field_trip", label: "Field Trip" },
  { value: "quiz", label: "Quiz" },
  { value: "other", label: "Other" },
];

const GRADE_CATEGORIES = [
  { value: "intermediate", label: "Intermediate / Periodical" },
  { value: "final", label: "Final Grade" },
];

export function CreateItemForm({
  cohortId,
  moduleId,
}: {
  cohortId: string;
  moduleId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ItemType>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [maxPoints, setMaxPoints] = useState("100");
  const [requiresGrading, setRequiresGrading] = useState(true);
  const [gradeCategory, setGradeCategory] = useState("intermediate");
  const [assignmentType, setAssignmentType] = useState("assignment");
  const [submissionType, setSubmissionType] = useState("text");
  const [dueAt, setDueAt] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle("");
    setContent("");
    setExternalUrl("");
    setMaxPoints("100");
    setRequiresGrading(true);
    setGradeCategory("intermediate");
    setAssignmentType("assignment");
    setSubmissionType("text");
    setDueAt("");
    setQuizQuestions([]);
    setPendingFile(null);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (type === "quiz" && quizQuestions.length === 0) {
      setError("Add at least one question.");
      return;
    }
    if (type === "quiz" && quizQuestions.some((q) => !q.text.trim())) {
      setError("Every question needs text.");
      return;
    }
    if (type === "file" && !pendingFile) {
      setError("Choose a file to upload.");
      return;
    }
    setLoading(true);
    setError(null);

    const body: Record<string, unknown> = {
      type,
      title: title.trim(),
    };
    if (content.trim()) body.content = content.trim();
    if (type === "link" && externalUrl.trim()) body.external_url = externalUrl.trim();
    if (type === "assignment") {
      body.max_points = parseInt(maxPoints, 10) || 100;
      body.requires_grading = requiresGrading;
      body.grade_category = gradeCategory;
      body.assignment_type = assignmentType;
      body.submission_type = submissionType;
      if (dueAt) body.due_at = new Date(dueAt).toISOString();
    }
    if (type === "quiz") {
      body.questions = quizQuestions;
      body.instructions = content.trim() || undefined;
      if (dueAt) body.due_at = new Date(dueAt).toISOString();
    }

    try {
      const res = await fetch(`/api/cohorts/${cohortId}/modules/${moduleId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { data?: { id: string }; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to create."); return; }

      if (pendingFile && json.data?.id) {
        const fd = new FormData();
        fd.append("file", pendingFile);
        const uploadRes = await fetch(
          `/api/cohorts/${cohortId}/modules/${moduleId}/items/${json.data.id}/upload`,
          { method: "POST", body: fd },
        );
        if (!uploadRes.ok) {
          const uploadJson = await uploadRes.json() as { error?: string };
          setError(`Item created, but file upload failed: ${uploadJson.error ?? "unknown error"}`);
          router.refresh();
          return;
        }
      }

      reset();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-card-border bg-card p-4 text-sm font-medium text-bio-green hover:border-bio-green/40"
      >
        <Plus className="h-4 w-4" /> Add item
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-card-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-4 text-sm font-semibold text-bio-text">Add Item</h3>
      <form onSubmit={(e) => void submit(e)} className="space-y-4">

        {/* Type selector */}
        <div className="flex gap-2 flex-wrap">
          {ITEM_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                type === t.value
                  ? "border-bio-green bg-bio-green/10 text-bio-green"
                  : "border-card-border text-bio-text-muted hover:text-bio-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text placeholder:text-bio-text-muted focus:outline-none focus:ring-2 focus:ring-bio-green/50"
        />

        {(type === "note" || type === "assignment" || type === "quiz") ? (
          <textarea
            placeholder={
              type === "assignment" ? "Instructions / description (optional)"
              : type === "quiz" ? "Instructions for taking the quiz (optional)"
              : "Content (optional)"
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={type === "quiz" ? 2 : 4}
            className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text placeholder:text-bio-text-muted focus:outline-none focus:ring-2 focus:ring-bio-green/50"
          />
        ) : null}

        {type === "link" ? (
          <input
            type="url"
            placeholder="https://…"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text placeholder:text-bio-text-muted focus:outline-none focus:ring-2 focus:ring-bio-green/50"
          />
        ) : null}

        {UPLOADABLE_TYPES.includes(type) ? (
          <div>
            <label className="mb-1.5 block text-xs text-bio-text-muted">
              {type === "file"
                ? "File (slides, PDF, etc.)"
                : type === "assignment"
                  ? "Attach instructions file (optional)"
                  : "Attach a file (optional)"}
            </label>
            {pendingFile ? (
              <div className="flex items-center gap-2 rounded-lg border border-bio-green/30 bg-bio-mint/30 px-3 py-2 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-bio-green" />
                <span className="flex-1 truncate">{pendingFile.name}</span>
                <button
                  type="button"
                  onClick={() => { setPendingFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                >
                  <X className="h-4 w-4 text-bio-text-muted hover:text-red-600" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-dashed border-card-border px-4 py-2.5 text-sm text-bio-text-muted hover:border-bio-green hover:text-bio-green"
              >
                <Upload className="h-4 w-4" /> Choose file
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f); }}
            />
          </div>
        ) : null}

        {type === "quiz" ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-bio-text-muted">Due date (optional)</label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text focus:outline-none focus:ring-2 focus:ring-bio-green/50"
              />
            </div>
            <QuizQuestionBuilder questions={quizQuestions} onChange={setQuizQuestions} />
          </div>
        ) : null}

        {type === "assignment" ? (
          <div className="space-y-3">
            {/* Grading toggle */}
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-card-border p-3 hover:bg-bio-surface">
              <input
                type="checkbox"
                checked={requiresGrading}
                onChange={(e) => setRequiresGrading(e.target.checked)}
                className="h-4 w-4 accent-bio-green"
              />
              <div>
                <p className="text-sm font-medium text-bio-text">Requires grading</p>
                <p className="text-xs text-bio-text-muted">Uncheck if this is a no-grade activity — admins/teachers can still grade optionally</p>
              </div>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-bio-text-muted">Activity type</label>
                <select
                  value={assignmentType}
                  onChange={(e) => setAssignmentType(e.target.value)}
                  className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text focus:outline-none focus:ring-2 focus:ring-bio-green/50"
                >
                  {ASSIGNMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-bio-text-muted">Grade category</label>
                <select
                  value={gradeCategory}
                  onChange={(e) => setGradeCategory(e.target.value)}
                  className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text focus:outline-none focus:ring-2 focus:ring-bio-green/50"
                >
                  {GRADE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-bio-text-muted">
                  Max points {!requiresGrading && <span className="text-bio-text-muted/60">(optional)</span>}
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxPoints}
                  onChange={(e) => setMaxPoints(e.target.value)}
                  disabled={!requiresGrading}
                  className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text focus:outline-none focus:ring-2 focus:ring-bio-green/50 disabled:opacity-40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-bio-text-muted">Due date (optional)</label>
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text focus:outline-none focus:ring-2 focus:ring-bio-green/50"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-bio-text-muted">Submission type</label>
                <select
                  value={submissionType}
                  onChange={(e) => setSubmissionType(e.target.value)}
                  className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text focus:outline-none focus:ring-2 focus:ring-bio-green/50"
                >
                  {SUBMISSION_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-40"
          >
            {loading ? "Adding…" : "Add item"}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); reset(); }}
            className="rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
