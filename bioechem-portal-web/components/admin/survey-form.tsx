"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type SurveyQuestion = {
  id: string;
  type: "text" | "rating" | "multiple_choice" | "checkbox";
  text: string;
  required: boolean;
  options: string[];
};

type Cohort = { id: string; name: string };

type SurveyFormData = {
  id?: string;
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  cohort_id?: string;
  questions?: SurveyQuestion[];
};

type Props = {
  initialData?: SurveyFormData;
  cohorts: Cohort[];
  defaultCohortId?: string;
};

const QUESTION_TYPES = [
  { value: "text", label: "Text" },
  { value: "rating", label: "Rating (1–5)" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "checkbox", label: "Checkboxes" },
];

function newQuestion(): SurveyQuestion {
  return { id: crypto.randomUUID(), type: "text", text: "", required: false, options: [] };
}

export function SurveyForm({ initialData, cohorts, defaultCohortId }: Props) {
  const router = useRouter();
  const isEdit = !!initialData?.id;

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [type, setType] = useState(initialData?.type ?? "custom");
  const [status, setStatus] = useState(initialData?.status ?? "draft");
  const [cohortId, setCohortId] = useState(initialData?.cohort_id ?? defaultCohortId ?? "");
  const [questions, setQuestions] = useState<SurveyQuestion[]>(initialData?.questions ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addQuestion() {
    setQuestions((q) => [...q, newQuestion()]);
  }

  function removeQuestion(id: string) {
    setQuestions((q) => q.filter((q) => q.id !== id));
  }

  function updateQuestion(id: string, patch: Partial<SurveyQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function addOption(qId: string) {
    setQuestions((qs) =>
      qs.map((q) => (q.id === qId ? { ...q, options: [...q.options, ""] } : q))
    );
  }

  function updateOption(qId: string, idx: number, value: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qId
          ? { ...q, options: q.options.map((o, i) => (i === idx ? value : o)) }
          : q
      )
    );
  }

  function removeOption(qId: string, idx: number) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qId ? { ...q, options: q.options.filter((_, i) => i !== idx) } : q
      )
    );
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    const next = [...questions];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setQuestions(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = { title, description, type, status, cohort_id: cohortId, questions };
    const url = isEdit ? `/api/admin/surveys/${initialData!.id}` : "/api/admin/surveys";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json() as { data?: { id: string }; error?: string };
    setSaving(false);

    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      return;
    }

    const surveyId = isEdit ? initialData!.id : json.data?.id;
    router.push(`/admin/surveys/${surveyId}`);
  }

  // Inputs on white/card background — use a visible border and explicit background
  const inputCls =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-bio-green/50 focus:border-bio-green";
  const labelCls = "block text-xs font-medium text-bio-text-muted mb-1";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push("/admin/surveys")}
        className="flex items-center gap-1.5 text-sm text-bio-text-muted hover:text-bio-green"
      >
        ← Back to Surveys
      </button>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Title *</label>
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Halfway Survey"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea
              className={inputCls}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional context for students"
            />
          </div>

          <div>
            <label className={labelCls}>Type</label>
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="halfway">Halfway</option>
              <option value="final">Final</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Cohort *</label>
            <select
              className={inputCls}
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
              required
            >
              <option value="">Select a cohort…</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Question builder */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-bio-text">Questions</h2>
            <button
              type="button"
              onClick={addQuestion}
              className="rounded-lg border border-bio-green px-3 py-1.5 text-xs font-medium text-bio-green hover:bg-bio-green/10"
            >
              + Add question
            </button>
          </div>

          {questions.length === 0 ? (
            <p className="text-sm text-bio-text-muted">No questions yet. Add one above.</p>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3"
                >
                  {/* Question card header: number + reorder + remove */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-bio-text-muted">
                      Question {idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, -1)}
                        disabled={idx === 0}
                        className="rounded px-1.5 py-0.5 text-xs text-bio-text-muted hover:text-bio-text disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, 1)}
                        disabled={idx === questions.length - 1}
                        className="rounded px-1.5 py-0.5 text-xs text-bio-text-muted hover:text-bio-text disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        className="rounded px-2 py-0.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Question text — full width, clear field */}
                  <div>
                    <label className={labelCls}>Question text *</label>
                    <input
                      className={inputCls}
                      placeholder="Enter your question here…"
                      value={q.text}
                      onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                      required
                    />
                  </div>

                  {/* Answer type selector */}
                  <div>
                    <label className={labelCls}>Answer type</label>
                    <select
                      className={inputCls}
                      value={q.type}
                      onChange={(e) =>
                        updateQuestion(q.id, {
                          type: e.target.value as SurveyQuestion["type"],
                          options: [],
                        })
                      }
                    >
                      {QUESTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Options for choice types */}
                  {(q.type === "multiple_choice" || q.type === "checkbox") && (
                    <div className="space-y-2">
                      <label className={labelCls}>Options</label>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex gap-2 items-center">
                          <input
                            className={`${inputCls} flex-1`}
                            placeholder={`Option ${oi + 1}`}
                            value={opt}
                            onChange={(e) => updateOption(q.id, oi, e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(q.id, oi)}
                            className="shrink-0 rounded px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(q.id)}
                        className="text-xs text-bio-green hover:underline"
                      >
                        + Add option
                      </button>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs text-bio-text-muted cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                      className="rounded accent-bio-green"
                    />
                    Required
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2 border-t border-card-border">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-bio-green px-5 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create survey"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/surveys")}
            className="rounded-lg border border-card-border px-5 py-2 text-sm font-medium text-bio-text-muted hover:bg-bio-mint/30"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
