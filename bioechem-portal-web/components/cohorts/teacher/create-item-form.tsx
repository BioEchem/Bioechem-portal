"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

type ItemType = "note" | "file" | "link" | "assignment";

const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: "note", label: "Note / Page" },
  { value: "link", label: "External Link" },
  { value: "assignment", label: "Assignment" },
];

const SUBMISSION_TYPES = [
  { value: "text", label: "Text response" },
  { value: "file", label: "File upload" },
  { value: "any", label: "Text + file" },
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
  const [submissionType, setSubmissionType] = useState("text");
  const [dueAt, setDueAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setContent("");
    setExternalUrl("");
    setMaxPoints("100");
    setSubmissionType("text");
    setDueAt("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
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
      body.submission_type = submissionType;
      if (dueAt) body.due_at = new Date(dueAt).toISOString();
    }

    try {
      const res = await fetch(`/api/cohorts/${cohortId}/modules/${moduleId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to create."); return; }
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

        {(type === "note" || type === "assignment") ? (
          <textarea
            placeholder={type === "assignment" ? "Instructions / description (optional)" : "Content (optional)"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
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

        {type === "assignment" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-bio-text-muted">Max points</label>
              <input
                type="number"
                min={1}
                value={maxPoints}
                onChange={(e) => setMaxPoints(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text focus:outline-none focus:ring-2 focus:ring-bio-green/50"
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
