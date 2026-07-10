"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { PortalCard } from "@/components/portal/portal-page";

type Doc = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  report:  "Report",
  impact:  "Impact",
};

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-600",
  report:  "bg-blue-50 text-blue-700",
  impact:  "bg-bio-green/10 text-bio-green",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function PartnerDocsList({ docs }: { docs: Doc[] }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const categories = ["impact", "report", "general"] as const;
  const grouped = categories.reduce<Record<string, Doc[]>>((acc, cat) => {
    const items = docs.filter((d) => d.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});
  const ungrouped = docs.filter((d) => !categories.includes(d.category as never));
  if (ungrouped.length > 0) grouped.other = ungrouped;

  async function download(doc: Doc) {
    if (!doc.file_name) return;
    setDownloading(doc.id);
    try {
      const res = await fetch(`/api/partner-docs/${doc.id}/download`);
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Failed to get download link.");
      const a = document.createElement("a");
      a.href = json.url;
      a.download = doc.file_name ?? "document";
      a.target = "_blank";
      a.click();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setDownloading(null);
    }
  }

  if (docs.length === 0) {
    return (
      <PortalCard>
        <div className="flex flex-col items-center py-12 text-center">
          <FileText className="mb-3 h-10 w-10 text-bio-text-muted" />
          <p className="text-sm font-medium text-bio-text">No documents available yet</p>
          <p className="mt-1 text-xs text-bio-text-muted">Reports and collateral shared by BioEChem will appear here.</p>
        </div>
      </PortalCard>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-bio-text-muted">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="space-y-2">
            {items.map((doc) => (
              <PortalCard key={doc.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-bio-text-muted" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-bio-text">{doc.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.general}`}>
                          {CATEGORY_LABELS[doc.category] ?? doc.category}
                        </span>
                      </div>
                      {doc.description && (
                        <p className="mt-0.5 text-sm text-bio-text-muted">{doc.description}</p>
                      )}
                      <p className="mt-1 text-xs text-bio-text-muted">
                        {fmt(doc.created_at)}
                        {doc.size_bytes != null && ` · ${formatBytes(doc.size_bytes)}`}
                        {doc.file_name && ` · ${doc.file_name}`}
                      </p>
                    </div>
                  </div>
                  {doc.file_name && (
                    <button
                      onClick={() => void download(doc)}
                      disabled={downloading === doc.id}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-sm text-bio-text-muted hover:border-bio-green hover:text-bio-green disabled:opacity-60 transition-colors"
                    >
                      {downloading === doc.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Download className="h-4 w-4" />}
                      Download
                    </button>
                  )}
                </div>
              </PortalCard>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
