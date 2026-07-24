"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Folder, FolderPlus, Loader2, Trash2, Upload } from "lucide-react";
import { PortalCard } from "@/components/portal/portal-page";
import { formatBytes } from "@/lib/format/bytes";

type ShareholderSummary = {
  id: string;
  full_name: string | null;
  email: string | null;
  doc_count: number;
};

type SubFolder = {
  id: string;
  name: string;
  created_at: string;
};

type FolderDoc = {
  id: string;
  title: string;
  description: string | null;
  file_name: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

type Crumb = { id: string; name: string };

/** Admin-side browser: pick a shareholder, then navigate a nested folder tree and upload documents. */
export function AdminShareholderFolderBrowser() {
  const [shareholders, setShareholders] = useState<ShareholderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const loadShareholders = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/shareholder-docs/folders");
    const json = await res.json() as { data?: ShareholderSummary[] };
    setShareholders(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void loadShareholders(); }, [loadShareholders]);

  const active = shareholders.find((s) => s.id === activeId) ?? null;

  if (active) {
    return (
      <ShareholderFolderDetail
        shareholderId={active.id}
        shareholderName={active.full_name ?? active.email ?? "Shareholder"}
        onBack={() => { setActiveId(null); void loadShareholders(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-bio-text-muted">
        Each approved shareholder gets their own folder. Only you can upload or organize here — shareholders can view and download.
      </p>

      {loading && <p className="text-sm text-bio-text-muted">Loading…</p>}

      {!loading && shareholders.length === 0 && (
        <PortalCard>
          <div className="flex flex-col items-center py-10 text-center">
            <Folder className="mb-3 h-8 w-8 text-bio-text-muted" />
            <p className="text-sm text-bio-text-muted">
              No approved shareholders yet. Once a shareholder signs up and is approved, their folder appears here.
            </p>
          </div>
        </PortalCard>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shareholders.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition-colors hover:border-bio-green"
          >
            <Folder className="h-8 w-8 shrink-0 text-bio-green" />
            <div className="min-w-0">
              <p className="truncate font-medium text-bio-text">{s.full_name ?? s.email ?? "Shareholder"}</p>
              <p className="truncate text-xs text-bio-text-muted">{s.email}</p>
              <p className="mt-0.5 text-xs text-bio-text-muted">{s.doc_count} document{s.doc_count === 1 ? "" : "s"}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ShareholderFolderDetail({
  shareholderId,
  shareholderName,
  onBack,
}: {
  shareholderId: string;
  shareholderName: string;
  onBack: () => void;
}) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Crumb[]>([]);
  const [folders, setFolders] = useState<SubFolder[]>([]);
  const [docs, setDocs] = useState<FolderDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = folderId ? `?folder_id=${folderId}` : "";
    const res = await fetch(`/api/admin/shareholder-docs/folders/${shareholderId}${qs}`);
    const json = await res.json() as { data?: { folders: SubFolder[]; docs: FolderDoc[]; breadcrumb: Crumb[] } };
    setFolders(json.data?.folders ?? []);
    setDocs(json.data?.docs ?? []);
    setBreadcrumb(json.data?.breadcrumb ?? []);
    setLoading(false);
  }, [shareholderId, folderId]);

  useEffect(() => { void load(); }, [load]);

  function triggerUpload() {
    setError(null);
    fileRef.current?.click();
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
      if (folderId) fd.append("folder_id", folderId);
      const res = await fetch(`/api/admin/shareholder-docs/folders/${shareholderId}/upload`, { method: "POST", body: fd });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function createFolder() {
    const name = window.prompt("Folder name")?.trim();
    if (!name) return;
    setCreatingFolder(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/shareholder-docs/folders/${shareholderId}/create-folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parent_folder_id: folderId }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to create folder.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder.");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function deleteFolder(folder: SubFolder) {
    if (!window.confirm(`Delete "${folder.name}"? It must be empty.`)) return;
    setError(null);
    const res = await fetch(`/api/admin/shareholder-docs/folders/${shareholderId}/${folder.id}`, { method: "DELETE" });
    const json = await res.json() as { error?: string };
    if (!res.ok) { setError(json.error ?? "Failed to delete folder."); return; }
    await load();
  }

  async function download(doc: FolderDoc) {
    const res = await fetch(`/api/shareholder-docs/${doc.id}/download`);
    const json = await res.json() as { url?: string; error?: string };
    if (!res.ok || !json.url) { alert(json.error ?? "Download failed."); return; }
    const a = document.createElement("a");
    a.href = json.url;
    a.download = doc.file_name ?? "document";
    a.target = "_blank";
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <button onClick={onBack} className="text-sm text-bio-text-muted hover:text-bio-green">&larr; All shareholders</button>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-lg font-semibold text-bio-text">
            <button onClick={() => setFolderId(null)} className="hover:text-bio-green">{shareholderName}&apos;s folder</button>
            {breadcrumb.map((c) => (
              <span key={c.id} className="flex items-center gap-1">
                <span className="text-bio-text-muted">/</span>
                <button onClick={() => setFolderId(c.id)} className="hover:text-bio-green">{c.name}</button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => void createFolder()}
            disabled={creatingFolder}
            className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-bio-text-muted hover:border-bio-green hover:text-bio-green disabled:opacity-50"
          >
            {creatingFolder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
            New folder
          </button>
          <button
            onClick={triggerUpload}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg bg-bio-green px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" className="hidden" onChange={(e) => void handleFile(e)} />
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-bio-text-muted">Loading…</p>
      ) : (
        <PortalCard>
          {folders.length === 0 && docs.length === 0 ? (
            <p className="text-sm text-bio-text-muted">This folder is empty.</p>
          ) : (
            <div className="space-y-4">
              {folders.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {folders.map((f) => (
                    <div
                      key={f.id}
                      className="group flex items-center gap-2 rounded-lg border border-card-border px-3 py-2"
                    >
                      <button onClick={() => setFolderId(f.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <Folder className="h-4 w-4 shrink-0 text-bio-green" />
                        <span className="truncate text-sm text-bio-text">{f.name}</span>
                      </button>
                      <button
                        onClick={() => void deleteFolder(f)}
                        className="shrink-0 text-bio-text-muted opacity-0 hover:text-red-600 group-hover:opacity-100"
                        title="Delete folder"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {docs.length > 0 && (
                <ul className="space-y-2">
                  {docs.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-card-border px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-bio-text-muted" />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-bio-text">{doc.title}</p>
                          {doc.size_bytes != null && (
                            <p className="text-xs text-bio-text-muted">{formatBytes(doc.size_bytes)}</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => void download(doc)} className="shrink-0 text-bio-text-muted hover:text-bio-green">
                        <Download className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </PortalCard>
      )}
    </div>
  );
}
