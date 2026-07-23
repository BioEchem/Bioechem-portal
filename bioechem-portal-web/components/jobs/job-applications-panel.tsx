"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import type { JobRow } from "@/components/jobs/job-editor";
import { formatShortDate as fmt } from "@/lib/format/date";

type Application = {
  id: string;
  status: string;
  cover_letter: string | null;
  admin_notes: string | null;
  created_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    resume_url: string | null;
  } | null;
};

const STATUS_OPTIONS = ["pending", "reviewed", "accepted", "rejected"];
const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-50 text-amber-700",
  reviewed: "bg-blue-50 text-blue-700",
  accepted: "bg-bio-green/10 text-bio-green",
  rejected: "bg-red-50 text-red-700",
};

export function JobApplicationsPanel({ job, onClose }: { job: JobRow; onClose: () => void }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/admin/jobs/${job.id}/applications`);
      const json = await res.json() as { data?: Application[] };
      setApps(json.data ?? []);
      setLoading(false);
    })();
  }, [job.id]);

  async function updateStatus(app: Application, status: string) {
    setUpdating(app.id);
    const res = await fetch(`/api/admin/jobs/${job.id}/applications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: app.id, status }),
    });
    const json = await res.json() as { data?: Application };
    if (json.data) setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, status } : a)));
    setUpdating(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-card-border p-5">
          <div>
            <h2 className="font-semibold text-bio-text">{job.title}</h2>
            <p className="text-sm text-bio-text-muted">{job.company} · Applications</p>
          </div>
          <button onClick={onClose} className="text-bio-text-muted hover:text-bio-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-bio-text-muted" />
            </div>
          ) : apps.length === 0 ? (
            <p className="py-10 text-center text-sm text-bio-text-muted">No applications yet.</p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-bio-text-muted">{apps.length} application{apps.length !== 1 ? "s" : ""}</p>
              {apps.map((app) => (
                <div key={app.id} className="rounded-xl border border-card-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-bio-text text-sm">
                        {app.profiles?.full_name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-bio-text-muted">{app.profiles?.email} · {app.profiles?.role}</p>
                      <p className="text-xs text-bio-text-muted mt-0.5">Applied {fmt(app.created_at)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <select
                        value={app.status}
                        disabled={updating === app.id}
                        onChange={(e) => void updateStatus(app, e.target.value)}
                        className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-bio-green/30 ${STATUS_STYLES[app.status] ?? STATUS_STYLES.pending}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                      {app.profiles?.resume_url && (
                        <a href={app.profiles.resume_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-bio-green hover:underline">
                          <ExternalLink className="h-3 w-3" /> Resume
                        </a>
                      )}
                    </div>
                  </div>
                  {app.cover_letter && (
                    <div className="mt-3 rounded-lg bg-bio-bg p-3">
                      <p className="mb-1 text-xs font-medium text-bio-text-muted">Cover letter</p>
                      <p className="whitespace-pre-wrap text-xs text-bio-text">{app.cover_letter}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
