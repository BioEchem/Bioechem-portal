"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Folder, Loader2, Upload } from "lucide-react";
import { PortalCard } from "@/components/portal/portal-page";
import { formatBytes } from "@/lib/format/bytes";

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
  created_by: string;
  created_at: string;
};

type Crumb = { id: string; name: string };

/** Partner-side view of their own folder: browse what BioEchem shared, and upload things like a signed W9. */
export function PartnerOwnFolder({ currentUserId }: { currentUserId: string }) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Crumb[]>([]);
  const [folders, setFolders] = useState<SubFolder[]>([]);
  const [docs, setDocs] = useState<FolderDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = folderId ? `?folder_id=${folderId}` : "";
    const res = await fetch(`/api/partner-docs/folder${qs}`);
    const json = await res.json() as { data?: { folders: SubFolder[]; docs: FolderDoc[]; breadcrumb: Crumb[] } };
    setFolders(json.data?.folders ?? []);
    setDocs(json.data?.docs ?? []);
    setBreadcrumb(json.data?.breadcrumb ?? []);
    setLoading(false);
  }, [folderId]);

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
      const res = await fetch("/api/partner-docs/folder/upload", { method: "POST", body: fd });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function download(doc: FolderDoc) {
    const res = await fetch(`/api/partner-docs/${doc.id}/download`);
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
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <button onClick={() => setFolderId(null)} className="font-medium text-bio-text hover:text-bio-green">Your folder</button>
          {breadcrumb.map((c) => (
            <span key={c.id} className="flex items-center gap-1">
              <span className="text-bio-text-muted">/</span>
              <button onClick={() => setFolderId(c.id)} className="text-bio-text hover:text-bio-green">{c.name}</button>
            </span>
          ))}
        </div>
        <button
          onClick={triggerUpload}
          disabled={uploading}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-bio-green px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload
        </button>
      </div>

      <input ref={fileRef} type="file" className="hidden" onChange={(e) => void handleFile(e)} />
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-bio-text-muted">Loading…</p>
      ) : folders.length === 0 && docs.length === 0 ? (
        <PortalCard>
          <div className="flex flex-col items-center py-10 text-center">
            <Folder className="mb-3 h-8 w-8 text-bio-text-muted" />
            <p className="text-sm text-bio-text-muted">
              {folderId ? "This folder is empty." : "No documents here yet."}
            </p>
          </div>
        </PortalCard>
      ) : (
        <PortalCard>
          <div className="space-y-4">
            {folders.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFolderId(f.id)}
                    className="flex items-center gap-2 rounded-lg border border-card-border px-3 py-2 text-left hover:border-bio-green"
                  >
                    <Folder className="h-4 w-4 shrink-0 text-bio-green" />
                    <span className="truncate text-sm text-bio-text">{f.name}</span>
                  </button>
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
                        <p className="text-xs text-bio-text-muted">
                          {doc.created_by === currentUserId ? "Uploaded by you" : "Shared by BioEchem"}
                          {doc.size_bytes != null && ` · ${formatBytes(doc.size_bytes)}`}
                        </p>
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
        </PortalCard>
      )}
    </div>
  );
}
