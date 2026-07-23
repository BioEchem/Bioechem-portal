"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Upload } from "lucide-react";
import { PortalCard } from "@/components/portal/portal-page";
import { PARTNER_FOLDER_CATEGORIES } from "@/lib/partner/folder-categories";
import { formatBytes } from "@/lib/format/bytes";

type FolderDoc = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_by: string;
  created_at: string;
};

/** Partner-side view of their own folder: browse what BioEchem shared, and upload things like a signed W9. */
export function PartnerOwnFolder({ currentUserId }: { currentUserId: string }) {
  const [docs, setDocs] = useState<FolderDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadCategory, setUploadCategory] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/partner-docs/folder");
    const json = await res.json() as { data?: FolderDoc[] };
    setDocs(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function triggerUpload(category: string) {
    setUploadCategory(category);
    setError(null);
    fileRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uploadCategory) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", uploadCategory);
      const res = await fetch("/api/partner-docs/folder/upload", { method: "POST", body: fd });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      setUploadCategory(null);
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

  if (loading) return <p className="text-sm text-bio-text-muted">Loading…</p>;

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" className="hidden" onChange={(e) => void handleFile(e)} />
      {error && <p className="text-sm text-red-600">{error}</p>}

      {PARTNER_FOLDER_CATEGORIES.map((cat) => {
        const items = docs.filter((d) => d.category === cat.value);
        return (
          <PortalCard key={cat.value}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-bio-green">{cat.label}</h3>
              <button
                onClick={() => triggerUpload(cat.value)}
                disabled={uploading && uploadCategory === cat.value}
                className="flex items-center gap-1.5 text-xs font-medium text-bio-text-muted hover:text-bio-green disabled:opacity-50"
              >
                {uploading && uploadCategory === cat.value
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Upload className="h-3.5 w-3.5" />}
                Upload
              </button>
            </div>
            {items.length === 0 ? (
              <p className="mt-2 text-xs text-bio-text-muted">No documents yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {items.map((doc) => (
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
          </PortalCard>
        );
      })}
    </div>
  );
}
