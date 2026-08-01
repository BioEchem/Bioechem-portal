"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, FileStack, FileText, Loader2, Trash2, Upload, X } from "lucide-react";
import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { AdminPartnerFolderBrowser } from "@/components/partner/partner-folder-browser";
import { AdminPartnerAnnouncements } from "@/components/partner/admin-partner-announcements";
import { formatBytes } from "@/lib/format/bytes";

type DocRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  published: boolean;
  created_at: string;
};

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "report",  label: "Report" },
  { value: "impact",  label: "Impact" },
];

function DocForm({
  initial,
  onSave,
  onSaved,
  onCancel,
  onDelete,
  mode,
}: {
  initial?: Partial<DocRow>;
  onSave: (data: Partial<DocRow>) => Promise<DocRow>;
  onSaved: () => void;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  mode: "create" | "edit";
}) {
  const [title,       setTitle]       = useState(initial?.title       ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category,    setCategory]    = useState(initial?.category    ?? "general");
  const [published,   setPublished]   = useState(initial?.published   ?? true);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [status,      setStatus]      = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [confirming,  setConfirming]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(mode === "create" ? "Creating…" : "Saving…");
    try {
      const saved = await onSave({ title, description: description || null, category, published });
      if (pendingFile) {
        setStatus("Uploading file…");
        const fd = new FormData();
        fd.append("file", pendingFile);
        const res = await fetch(`/api/admin/partner-docs/${saved.id}/upload`, { method: "POST", body: fd });
        if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? "Upload failed"); }
        setPendingFile(null);
      }
      setStatus(null);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setStatus(null);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setStatus("Deleting…");
    try { await onDelete(); } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setStatus(null); setConfirming(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Title *</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
            placeholder="2026 Impact Report" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Description</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
            placeholder="Brief description of this document…" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-bio-text-muted">
          File <span className="font-normal">(PDF, Word, Excel, PowerPoint — max 50 MB)</span>
        </label>
        {initial?.file_name && !pendingFile ? (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-bio-text">
              <FileText className="h-4 w-4 text-bio-green" /> {initial.file_name}
              {initial.size_bytes != null && <span className="text-bio-text-muted">({formatBytes(initial.size_bytes)})</span>}
            </span>
            <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-bio-text-muted hover:text-bio-green">Replace</button>
          </div>
        ) : pendingFile ? (
          <div className="flex items-center gap-2 rounded-lg border border-bio-green/30 bg-bio-mint/30 px-3 py-2 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-bio-green" />
            <span className="flex-1 truncate">{pendingFile.name}</span>
            <span className="text-xs text-bio-text-muted">{formatBytes(pendingFile.size)}</span>
            <button type="button" onClick={() => { setPendingFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
              <X className="h-4 w-4 text-bio-text-muted hover:text-red-600" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-dashed border-card-border px-4 py-2.5 text-sm text-bio-text-muted hover:border-bio-green hover:text-bio-green">
            <Upload className="h-4 w-4" /> Choose file
          </button>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f); }} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 rounded border-card-border accent-bio-green" />
        <span className="text-bio-text">Published (visible to all partners)</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={!!status}
          className="flex items-center gap-2 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60">
          {status ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {status ?? (mode === "create" ? "Create" : "Save changes")}
        </button>
        <button type="button" onClick={onCancel} disabled={!!status}
          className="rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text disabled:opacity-60">
          Cancel
        </button>
        {onDelete && mode === "edit" && (
          confirming ? (
            <span className="ml-auto flex items-center gap-2">
              <span className="text-xs text-red-600">Delete this document?</span>
              <button type="button" onClick={() => void handleDelete()} disabled={!!status}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60">
                {status === "Deleting…" ? "Deleting…" : "Yes, delete"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="text-xs text-bio-text-muted hover:underline">Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirming(true)}
              className="ml-auto flex items-center gap-1 text-xs text-bio-text-muted hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )
        )}
      </div>
    </form>
  );
}

export default function AdminPartnerDocsPage() {
  const [tab, setTab] = useState<"shared" | "folders" | "announcements">("shared");
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/partner-docs");
    const json = await res.json() as { data?: DocRow[] };
    setDocs(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(data: Partial<DocRow>): Promise<DocRow> {
    const res = await fetch("/api/admin/partner-docs", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const json = await res.json() as { data?: DocRow; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Failed to create");
    setDocs((prev) => [json.data!, ...prev]);
    setCreating(false);
    return json.data!;
  }

  async function handleUpdate(id: string, data: Partial<DocRow>): Promise<DocRow> {
    const res = await fetch(`/api/admin/partner-docs/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const json = await res.json() as { data?: DocRow; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Failed to update");
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...json.data } : d)));
    setExpandedId(null);
    return json.data!;
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/partner-docs/${id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? "Delete failed"); }
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  async function togglePublish(doc: DocRow) {
    const res = await fetch(`/api/admin/partner-docs/${doc.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !doc.published }),
    });
    const json = await res.json() as { data?: DocRow };
    if (json.data) setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, published: json.data!.published } : d)));
  }

  return (
    <PortalPage title="Partner Documents" description="Upload and manage documents visible to industry partners.">
      <div className="space-y-4">
        <div className="flex gap-1 border-b border-card-border">
          {[
            { key: "shared" as const, label: "Shared with all partners" },
            { key: "folders" as const, label: "Partner folders" },
            { key: "announcements" as const, label: "Announcements" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "border-bio-green text-bio-green"
                  : "border-transparent text-bio-text-muted hover:text-bio-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "folders" ? (
          <AdminPartnerFolderBrowser />
        ) : tab === "announcements" ? (
          <AdminPartnerAnnouncements />
        ) : (
      <>
        <div className="flex justify-end">
          {!creating && (
            <button onClick={() => setCreating(true)}
              className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90">
              + Add document
            </button>
          )}
        </div>

        {creating && (
          <PortalCard>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">New document</h2>
            <DocForm mode="create" onSave={handleCreate} onSaved={load} onCancel={() => setCreating(false)} />
          </PortalCard>
        )}

        {loading && <p className="text-sm text-bio-text-muted">Loading…</p>}

        {!loading && docs.length === 0 && !creating && (
          <PortalCard>
            <div className="flex flex-col items-center py-10 text-center">
              <FileStack className="mb-3 h-8 w-8 text-bio-text-muted" />
              <p className="text-sm text-bio-text-muted">No documents yet. Click <strong>+ Add document</strong> to upload one.</p>
            </div>
          </PortalCard>
        )}

        {docs.map((doc) => (
          <PortalCard key={doc.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-bio-text">{doc.title}</span>
                  <span className="rounded-full border border-card-border px-2 py-0.5 text-xs text-bio-text-muted capitalize">{doc.category}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${doc.published ? "bg-bio-green/10 text-bio-green" : "bg-amber-100 text-amber-700"}`}>
                    {doc.published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-bio-text-muted">
                  {doc.file_name
                    ? `${doc.file_name}${doc.size_bytes != null ? ` · ${formatBytes(doc.size_bytes)}` : ""}`
                    : "No file attached"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button onClick={() => void togglePublish(doc)}
                  className={`text-xs font-medium ${doc.published ? "text-amber-600 hover:text-amber-700" : "text-bio-green hover:text-bio-green/80"}`}>
                  {doc.published ? "Unpublish" : "Publish"}
                </button>
                <button onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                  className="text-bio-text-muted hover:text-bio-green">
                  {expandedId === doc.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {expandedId === doc.id && (
              <div className="mt-4 border-t border-card-border pt-4">
                <DocForm
                  mode="edit"
                  initial={doc}
                  onSave={(data) => handleUpdate(doc.id, data)}
                  onSaved={load}
                  onCancel={() => setExpandedId(null)}
                  onDelete={() => handleDelete(doc.id)}
                />
              </div>
            )}
          </PortalCard>
        ))}
      </>
        )}
      </div>
    </PortalPage>
  );
}
