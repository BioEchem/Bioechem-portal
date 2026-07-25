"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, MessageSquare, Upload } from "lucide-react";
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
  admin_comment: string | null;
  commented_at: string | null;
  updated_at: string;
};

type CareerUpdateWithProfile = CareerUpdate & {
  user_id: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

/** One participant's row in the manager view, with inline comment editing. */
function ManagerEntryCard({
  entry,
  cohortId,
}: {
  entry: CareerUpdateWithProfile;
  cohortId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState(entry.admin_comment ?? "");
  const [commentedAt, setCommentedAt] = useState(entry.commented_at);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveComment() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/career-plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: entry.user_id, admin_comment: comment }),
      });
      const json = await res.json() as { data?: CareerUpdate; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save comment.");
      setCommentedAt(json.data?.commented_at ?? null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save comment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PortalCard>
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

      <div className="mt-3 border-t border-card-border pt-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-bio-text-muted">
          <MessageSquare className="h-3.5 w-3.5" /> Your comment
        </div>

        {editing ? (
          <>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={saving}
              rows={3}
              placeholder="Leave a comment for this participant…"
              className="mt-2 w-full resize-y rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/25"
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => void handleSaveComment()}
                disabled={saving}
                className="rounded-lg bg-bio-green px-3 py-1.5 text-xs font-medium text-white hover:bg-bio-green/90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save comment"}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setComment(entry.admin_comment ?? ""); setError(null); }}
                disabled={saving}
                className="rounded-lg border border-card-border px-3 py-1.5 text-xs text-bio-text-muted hover:border-bio-green hover:text-bio-green disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {comment ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-bio-text">{comment}</p>
            ) : (
              <p className="mt-1 text-sm italic text-bio-text-muted/60">No comment yet.</p>
            )}
            {commentedAt && <span className="mt-1 block text-xs text-bio-text-muted">{fmt(commentedAt)}</span>}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-2 rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-bio-text-muted hover:border-bio-green hover:text-bio-green"
            >
              {comment ? "Edit comment" : "Add comment"}
            </button>
          </>
        )}
      </div>
    </PortalCard>
  );
}

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

      {entry?.admin_comment && (
        <div className="mt-3 rounded-lg border border-bio-green/30 bg-bio-green/5 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-bio-green">
            <MessageSquare className="h-3.5 w-3.5" /> Comment from your teacher/admin
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-bio-text">{entry.admin_comment}</p>
          {entry.commented_at && (
            <span className="mt-1 block text-xs text-bio-text-muted">{fmt(entry.commented_at)}</span>
          )}
        </div>
      )}

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
        <ManagerEntryCard key={entry.id} entry={entry} cohortId={cohortId} />
      ))}
    </div>
  );
}
