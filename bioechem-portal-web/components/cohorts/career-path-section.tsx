"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, MessageSquare, Plus, Upload } from "lucide-react";
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
  created_at: string;
  updated_at: string;
};

type CareerUpdateWithProfile = CareerUpdate & {
  user_id: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

/** One entry's manager comment, with inline editing. Shared by the manager list. */
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
      const res = await fetch(`/api/cohorts/${cohortId}/career-plan/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_comment: comment }),
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
        <span className="text-xs text-bio-text-muted">Added {fmt(entry.created_at)}</span>
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

/** One of the participant's own entries — inline content editing + file attach. */
function SelfEntryCard({
  entry,
  cohortId,
  onChange,
  onDelete,
}: {
  entry: CareerUpdate;
  cohortId: string;
  onChange: (updated: CareerUpdate) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(entry.content ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/career-plan/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json() as { data?: CareerUpdate; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save.");
      if (json.data) onChange(json.data);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this career path entry? This can't be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/career-plan/${entry.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "Failed to delete.");
      onDelete(entry.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
      setDeleting(false);
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
      const res = await fetch(`/api/cohorts/${cohortId}/career-plan/${entry.id}/upload`, { method: "POST", body: fd });
      const json = await res.json() as { data?: CareerUpdate; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      if (json.data) onChange({ ...entry, ...json.data });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <PortalCard>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-bio-text-muted">Added {fmt(entry.created_at)}</span>
        {!editing && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs font-medium text-bio-green hover:underline"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={saving}
          rows={4}
          className="mt-2 w-full resize-y rounded-lg border border-card-border bg-white px-3 py-2.5 text-sm text-bio-text focus:border-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/25"
        />
      ) : entry.content ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-bio-text">{entry.content}</p>
      ) : (
        <p className="mt-2 text-sm italic text-bio-text-muted/60">No notes written.</p>
      )}

      {entry.file_name && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-card-border bg-bio-bg px-3 py-2 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-bio-green" />
          <a href={entry.file_url ?? undefined} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:text-bio-green">
            {entry.file_name}
          </a>
          {entry.size_bytes != null && <span className="text-xs text-bio-text-muted">{formatBytes(entry.size_bytes)}</span>}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {entry.admin_comment && (
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
        {editing ? (
          <>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setContent(entry.content ?? ""); setError(null); }}
              disabled={saving}
              className="rounded-lg border border-card-border px-3 py-2 text-sm text-bio-text-muted hover:border-bio-green hover:text-bio-green disabled:opacity-60"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm text-bio-text-muted hover:border-bio-green hover:text-bio-green disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {entry.file_name ? "Replace file" : "Attach a file (optional)"}
          </button>
        )}
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => void handleFile(e)} />
      </div>
    </PortalCard>
  );
}

/** Participant's career path entries for this cohort — add as many as you like, any time. */
export function CareerPathSelfSection({ cohortId }: { cohortId: string }) {
  const [entries, setEntries] = useState<CareerUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [savingNew, setSavingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const newFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/cohorts/${cohortId}/career-plan`);
    const json = await res.json() as { data?: CareerUpdate[] };
    setEntries(json.data ?? []);
    setLoading(false);
  }, [cohortId]);

  useEffect(() => { void load(); }, [load]);

  async function handleAdd() {
    setSavingNew(true);
    setError(null);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/career-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
      const json = await res.json() as { data?: CareerUpdate; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to add entry.");
      let created = json.data as CareerUpdate;

      if (newFile) {
        const fd = new FormData();
        fd.append("file", newFile);
        const uploadRes = await fetch(`/api/cohorts/${cohortId}/career-plan/${created.id}/upload`, {
          method: "POST",
          body: fd,
        });
        const uploadJson = await uploadRes.json() as { data?: CareerUpdate; error?: string };
        if (!uploadRes.ok) throw new Error(uploadJson.error ?? "Entry saved, but the file failed to upload.");
        if (uploadJson.data) created = { ...created, ...uploadJson.data };
      }

      setEntries((prev) => [created, ...prev]);
      setNewContent("");
      setNewFile(null);
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add entry.");
    } finally {
      setSavingNew(false);
    }
  }

  function updateEntry(updated: CareerUpdate) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  if (loading) return <p className="text-sm text-bio-text-muted">Loading…</p>;

  return (
    <div className="space-y-3">
      <PortalCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">Career path &amp; interests</h2>
            <p className="mt-1 text-sm text-bio-text-muted">
              Share your career path, plan, or what you&apos;re interested in within this field..
            </p>
          </div>
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-bio-green px-3 py-2 text-sm font-medium text-white hover:bg-bio-green/90"
            >
              <Plus className="h-4 w-4" /> Add new entry
            </button>
          )}
        </div>

        {adding && (
          <div className="mt-3 border-t border-card-border pt-3">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              disabled={savingNew}
              rows={4}
              placeholder="e.g. I'm interested in biomedical engineering and want to pursue a degree in bioengineering. This program has helped me..."
              className="w-full resize-y rounded-lg border border-card-border bg-white px-3 py-2.5 text-sm text-bio-text focus:border-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/25"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={() => void handleAdd()}
                disabled={savingNew}
                className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60"
              >
                {savingNew ? "Saving…" : "Save entry"}
              </button>
              <button
                type="button"
                onClick={() => newFileRef.current?.click()}
                disabled={savingNew}
                className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-2 text-sm text-bio-text-muted hover:border-bio-green hover:text-bio-green disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {newFile ? newFile.name : "Attach a file (optional)"}
              </button>
              <input
                ref={newFileRef}
                type="file"
                className="hidden"
                onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => { setAdding(false); setNewContent(""); setNewFile(null); setError(null); }}
                disabled={savingNew}
                className="rounded-lg border border-card-border px-3 py-2 text-sm text-bio-text-muted hover:border-bio-green hover:text-bio-green disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </PortalCard>

      {entries.length === 0 && !adding ? (
        <PortalCard>
          <p className="text-sm text-bio-text-muted">
            You haven&apos;t added a career path entry yet. Click &quot;Add new entry&quot; above to get started.
          </p>
        </PortalCard>
      ) : (
        entries.map((entry) => (
          <SelfEntryCard key={entry.id} entry={entry} cohortId={cohortId} onChange={updateEntry} onDelete={removeEntry} />
        ))
      )}
    </div>
  );
}

/** Teacher/admin view of every participant's career path entries in this cohort, grouped by participant. */
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

  // Group entries by participant, preserving the newest-first order the API
  // already returns so the most recently active participant appears first.
  const groups = new Map<string, CareerUpdateWithProfile[]>();
  for (const entry of entries) {
    const list = groups.get(entry.user_id) ?? [];
    list.push(entry);
    groups.set(entry.user_id, list);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([userId, userEntries]) => (
        <div key={userId}>
          <h3 className="mb-2 text-sm font-semibold text-bio-text">
            {userEntries[0].profiles?.full_name ?? userEntries[0].profiles?.email ?? "Unknown participant"}
            <span className="ml-2 text-xs font-normal text-bio-text-muted">
              {userEntries.length} {userEntries.length === 1 ? "entry" : "entries"}
            </span>
          </h3>
          <div className="space-y-3">
            {userEntries.map((entry) => (
              <ManagerEntryCard key={entry.id} entry={entry} cohortId={cohortId} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
