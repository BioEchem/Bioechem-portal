"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Eye, EyeOff } from "lucide-react";

type Module = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  published: boolean;
};

export function ModuleList({
  cohortId,
  modules: initial,
  canManage,
  backHref,
  isBioAdminViewing,
}: {
  cohortId: string;
  modules: Module[];
  canManage: boolean;
  backHref?: string;
  isBioAdminViewing?: boolean;
}) {
  const [modules, setModules] = useState(initial);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function togglePublish(mod: Module) {
    const next = !mod.published;
    setModules((prev) => prev.map((m) => (m.id === mod.id ? { ...m, published: next } : m)));
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/modules/${mod.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: next }),
      });
      if (!res.ok) {
        // revert on failure
        setModules((prev) => prev.map((m) => (m.id === mod.id ? { ...m, published: mod.published } : m)));
      }
    } catch {
      setModules((prev) => prev.map((m) => (m.id === mod.id ? { ...m, published: mod.published } : m)));
    }
  }

  async function createModule(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      });
      const json = await res.json() as { data?: Module; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to create."); return; }
      if (json.data) setModules((prev) => [...prev, json.data!]);
      setTitle("");
      setDescription("");
      setShowForm(false);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {modules.length === 0 ? (
        <p className="text-sm text-bio-text-muted">
          {canManage ? "No modules yet. Create the first one below." : "No modules available yet."}
        </p>
      ) : (
        modules.map((mod) => (
          <div
            key={mod.id}
            className="flex items-center rounded-xl border border-card-border bg-card shadow-[var(--shadow-card)] hover:border-bio-green/40"
          >
            {isBioAdminViewing ? (
              <div className="flex flex-1 min-w-0 items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bio-mint/40">
                  <BookOpen className="h-5 w-5 text-bio-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-bio-text truncate">{mod.title}</p>
                    {!mod.published ? (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Draft
                      </span>
                    ) : null}
                  </div>
                  {mod.description ? (
                    <p className="mt-0.5 text-sm text-bio-text-muted truncate">{mod.description}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <Link
                href={`/cohorts/${cohortId}?tab=modules&moduleId=${mod.id}${backHref ? `&back=${encodeURIComponent(backHref)}` : ""}`}
                className="flex flex-1 min-w-0 items-center gap-4 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bio-mint/40">
                  <BookOpen className="h-5 w-5 text-bio-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-bio-text truncate">{mod.title}</p>
                    {!mod.published ? (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Draft
                      </span>
                    ) : null}
                  </div>
                  {mod.description ? (
                    <p className="mt-0.5 text-sm text-bio-text-muted truncate">{mod.description}</p>
                  ) : null}
                </div>
              </Link>
            )}

            {canManage ? (
              <button
                type="button"
                onClick={() => void togglePublish(mod)}
                title={mod.published ? "Published — click to unpublish" : "Draft — click to publish"}
                className={`mr-3 shrink-0 rounded-md p-2 transition-colors ${
                  mod.published
                    ? "text-bio-green hover:text-bio-green/70"
                    : "text-bio-text-muted hover:text-bio-green"
                }`}
              >
                {mod.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            ) : null}
          </div>
        ))
      )}

      {canManage ? (
        <div className="rounded-xl border border-dashed border-card-border bg-card p-4">
          {showForm ? (
            <form onSubmit={(e) => void createModule(e)} className="space-y-3">
              <h3 className="text-sm font-semibold text-bio-text">New Module</h3>
              <input
                type="text"
                placeholder="Module title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text placeholder:text-bio-text-muted focus:outline-none focus:ring-2 focus:ring-bio-green/50"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text placeholder:text-bio-text-muted focus:outline-none focus:ring-2 focus:ring-bio-green/50"
              />
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-40"
                >
                  {loading ? "Creating…" : "Create module"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-sm font-medium text-bio-green hover:underline"
            >
              + Add module
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
