"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ClipboardCheck, ExternalLink, ChevronRight } from "lucide-react";

type SurveyRow = { id: string; title: string; type: string; status: string; created_at: string };

interface Props {
  cohortId: string;
  cohortName: string;
  surveys: SurveyRow[];
}

const STATUS_COLORS: Record<string, string> = {
  active:  "bg-green-100 text-green-800",
  draft:   "bg-gray-100 text-gray-600",
  closed:  "bg-red-100 text-red-700",
};

const TYPE_LABELS: Record<string, string> = {
  halfway:  "Halfway",
  final:    "Final",
  custom:   "Custom",
};

export function CohortsurveysPanel({ cohortId, cohortName, surveys }: Props) {
  const router = useRouter();
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"halfway" | "final" | "custom">("custom");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-bio-green";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), type, cohort_id: cohortId }),
      });
      const json = await res.json() as { data?: { id: string }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to create survey");
      router.push(`/admin/surveys/${json.data!.id}/edit`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          Surveys
        </h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/surveys/new?cohort_id=${cohortId}&cohort_name=${encodeURIComponent(cohortName)}`}
            className="flex items-center gap-1 rounded-lg border border-bio-green px-3 py-1.5 text-xs font-medium text-bio-green hover:bg-bio-green hover:text-white transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Full editor
          </Link>
          <button
            onClick={() => setShowQuickCreate((v) => !v)}
            className="flex items-center gap-1 rounded-lg bg-bio-green px-3 py-1.5 text-xs font-medium text-white hover:bg-bio-green-dark transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Quick create
          </button>
        </div>
      </div>

      {showQuickCreate && (
        <form onSubmit={handleCreate} className="mb-5 rounded-xl border border-bio-green/30 bg-green-50 p-4 space-y-3">
          <p className="text-xs font-medium text-bio-green">New survey for this cohort</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Survey title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Halfway Check-in Survey"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "halfway" | "final" | "custom")}
              className={inputCls}
            >
              <option value="halfway">Halfway</option>
              <option value="final">Final</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-bio-green px-4 py-2 text-xs font-medium text-white hover:bg-bio-green-dark disabled:opacity-60 transition-colors"
            >
              {submitting ? "Creating…" : "Create & edit questions →"}
            </button>
            <button
              type="button"
              onClick={() => { setShowQuickCreate(false); setTitle(""); setError(null); }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {surveys.length === 0 ? (
        <p className="text-sm text-bio-text-muted">No surveys yet for this cohort.</p>
      ) : (
        <ul className="space-y-2">
          {surveys.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/surveys/${s.id}`}
                className="flex items-center justify-between rounded-lg border border-card-border bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {s.status}
                  </span>
                  <span className="truncate text-sm font-medium text-bio-text">{s.title}</span>
                  <span className="shrink-0 text-xs text-bio-text-muted">· {TYPE_LABELS[s.type] ?? s.type}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-bio-text-muted group-hover:text-bio-green shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {surveys.length > 0 && (
        <div className="mt-3 text-right">
          <Link href="/admin/surveys" className="inline-flex items-center gap-1 text-xs text-bio-green hover:underline">
            <ExternalLink className="h-3 w-3" />
            Manage all surveys
          </Link>
        </div>
      )}
    </div>
  );
}
