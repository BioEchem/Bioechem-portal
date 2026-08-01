"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, Folder } from "lucide-react";
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

/** Shareholder-side view of their own folder: browse and download only, BioEchem uploads/organizes. */
export function ShareholderOwnFolder() {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Crumb[]>([]);
  const [folders, setFolders] = useState<SubFolder[]>([]);
  const [docs, setDocs] = useState<FolderDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = folderId ? `?folder_id=${folderId}` : "";
    const res = await fetch(`/api/shareholder-docs/folder${qs}`);
    const json = await res.json() as { data?: { folders: SubFolder[]; docs: FolderDoc[]; breadcrumb: Crumb[] } };
    setFolders(json.data?.folders ?? []);
    setDocs(json.data?.docs ?? []);
    setBreadcrumb(json.data?.breadcrumb ?? []);
    setLoading(false);
  }, [folderId]);

  useEffect(() => { void load(); }, [load]);

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
      <div className="flex flex-wrap items-center gap-1 text-sm">
        <button onClick={() => setFolderId(null)} className="font-medium text-bio-text hover:text-bio-green">Your folder</button>
        {breadcrumb.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <span className="text-bio-text-muted">/</span>
            <button onClick={() => setFolderId(c.id)} className="text-bio-text hover:text-bio-green">{c.name}</button>
          </span>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-bio-text-muted">Loading…</p>
      ) : folders.length === 0 && docs.length === 0 ? (
        <PortalCard>
          <div className="flex flex-col items-center py-10 text-center">
            <Folder className="mb-3 h-8 w-8 text-bio-text-muted" />
            <p className="text-sm text-bio-text-muted">
              {folderId ? "This folder is empty." : "BioEchem hasn't added anything to your folder yet."}
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
        </PortalCard>
      )}
    </div>
  );
}
