"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Upload } from "lucide-react";
import { PortalCard } from "@/components/portal/portal-page";
import { formatBytes } from "@/lib/format/bytes";
import { formatShortDate as fmt } from "@/lib/format/date";

type CareerUpdate = {
  id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  updated_at: string;
};

type CareerUpdateWithProfile = CareerUpdate & {
  user_id: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

/** Participant's own editable career path / plan / interests for this cohort. */
export function CareerPathSelfSection({ cohortId }: { cohortId: string }) {
  const [entry, setEntry] = useState<CareerUpdate | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/cohorts/${cohortId}/career-plan`);
    const json = await res.json() as { data?: CareerUpdate | null };
    setEntry(json.data ?? null);
    setContent(json.data?.content ?? "");
    setLoading(false);
  }, [cohortId]);

  useEffect(() => { void load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/career-plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json() as { data?: CareerUpdate; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save.");
      setEntry(json.data ?? null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/cohorts/${cohortId}/career-plan/upload`, { method: "POST", body: fd });
      const json = await res.json() as { data?: CareerUpdate; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      setEntry(json.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <p className="text-sm text-bio-text-muted">Loading…</p>;

  return (
    <PortalCard>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">Career path &amp; interests</h2>
      <p className="mt-1 text-sm text-bio-text-muted">
        Share your career path, plan, or what you&apos;re interested in within this field. You can update this anytime.
      </p>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={saving}
        rows={5}
        placeholder="e.g. I'm interested in biomedical engineering and want to pursue a degree in bioengineering. This program has helped me..."
        className="mt-3 w-full resize-y rounded-lg border border-card-border bg-white px-3 py-2.5 text-sm text-bio-text focus:border-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/25"
      />

      {entry?.file_name && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-card-border bg-bio-bg px-3 py-2 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-bio-green" />
          <a href={entry.file_url ?? undefined} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:text-bio-green">
            {entry.file_name}
          </a>
          {entry.size_bytes != null && <span className="text-xs text-bio-text-muted">{formatBytes(entry.size_bytes)}</span>}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm text-bio-text-muted hover:border-bio-green hover:text-bio-green disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {entry?.file_name ? "Replace file" : "Attach a file (optional)"}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => void handleFile(e)} />
        {saved && <span className="text-xs text-bio-green">Saved</span>}
        {entry?.updated_at && (
          <span className="text-xs text-bio-text-muted">Last updated {fmt(entry.updated_at)}</span>
        )}
      </div>
    </PortalCard>
  );
}

/** Teacher/admin read-only view of every participant's career path in this cohort. */
export function CareerPathManagerSection({ cohortId }: { cohortId: string }) {
  const [entries, setEntries] = useState<CareerUpdateWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/cohorts/${cohortId}/career-plan?all=1`);
      const json = await res.json() as { data?: CareerUpdateWithProfile[] };
      setEntries(json.data ?? []);
      setLoading(false);
    })();
  }, [cohortId]);

  if (loading) return <p className="text-sm text-bio-text-muted">Loading…</p>;

  if (entries.length === 0) {
    return (
      <PortalCard>
        <p className="text-sm text-bio-text-muted">No participants have shared their career path yet.</p>
      </PortalCard>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <PortalCard key={entry.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-bio-text">
              {entry.profiles?.full_name ?? entry.profiles?.email ?? "Unknown participant"}
            </span>
            <span className="text-xs text-bio-text-muted">Updated {fmt(entry.updated_at)}</span>
          </div>
          {entry.content ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-bio-text-muted">{entry.content}</p>
          ) : (
            <p className="mt-2 text-sm italic text-bio-text-muted/60">No notes shared.</p>
          )}
          {entry.file_name && (
            <a
              href={entry.file_url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-fit items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-bio-text-muted hover:border-bio-green hover:text-bio-green"
            >
              <Download className="h-3.5 w-3.5" /> {entry.file_name}
            </a>
          )}
        </PortalCard>
      ))}
    </div>
  );
}
