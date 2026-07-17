"use client";

import { useEffect, useState } from "react";
import { Download, Megaphone } from "lucide-react";
import { PortalCard } from "@/components/portal/portal-page";

type Announcement = {
  id: string;
  title: string;
  body: string;
  target: string;
  file_name: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function PartnerAnnouncementsList() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch("/api/partner-announcements");
      const json = await res.json() as { data?: Announcement[] };
      setAnnouncements(json.data ?? []);
      setLoading(false);
    })();
  }, []);

  async function download(a: Announcement) {
    const res = await fetch(`/api/partner-announcements/${a.id}/download`);
    const json = await res.json() as { url?: string; error?: string };
    if (!res.ok || !json.url) { alert(json.error ?? "Download failed."); return; }
    const link = document.createElement("a");
    link.href = json.url;
    link.download = a.file_name ?? "attachment";
    link.target = "_blank";
    link.click();
  }

  if (loading) return <p className="text-sm text-bio-text-muted">Loading…</p>;

  if (announcements.length === 0) {
    return (
      <PortalCard>
        <div className="flex flex-col items-center py-12 text-center">
          <Megaphone className="mb-3 h-10 w-10 text-bio-text-muted" />
          <p className="text-sm font-medium text-bio-text">No announcements yet</p>
          <p className="mt-1 text-xs text-bio-text-muted">Updates from the BioEchem team will appear here.</p>
        </div>
      </PortalCard>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((a) => (
        <PortalCard key={a.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-bio-text">{a.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-bio-text-muted">{a.body}</p>
              <p className="mt-2 text-xs text-bio-text-muted">{fmt(a.created_at)}</p>
            </div>
            {a.file_name && (
              <button
                onClick={() => void download(a)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-sm text-bio-text-muted hover:border-bio-green hover:text-bio-green"
              >
                <Download className="h-4 w-4" />
                {a.size_bytes != null ? formatBytes(a.size_bytes) : "File"}
              </button>
            )}
          </div>
        </PortalCard>
      ))}
    </div>
  );
}
