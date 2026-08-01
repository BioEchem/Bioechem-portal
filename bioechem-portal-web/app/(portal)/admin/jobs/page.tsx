"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase, ChevronDown, ChevronUp, Users } from "lucide-react";
import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { JobEditor, type JobRow } from "@/components/jobs/job-editor";
import { JobApplicationsPanel } from "@/components/jobs/job-applications-panel";

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingAppsFor, setViewingAppsFor] = useState<JobRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/jobs");
    const json = await res.json() as { data?: JobRow[] };
    setJobs(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(data: Partial<JobRow>): Promise<JobRow> {
    const res = await fetch("/api/admin/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json() as { data?: JobRow; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Failed to create");
    setJobs((prev) => [json.data!, ...prev]);
    setCreating(false);
    return json.data!;
  }

  async function handleUpdate(id: string, data: Partial<JobRow>): Promise<JobRow> {
    const res = await fetch(`/api/admin/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json() as { data?: JobRow; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Failed to update");
    setJobs((prev) => prev.map((j) => (j.id === id ? json.data! : j)));
    setExpandedId(null);
    return json.data!;
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/jobs/${id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? "Delete failed"); }
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  async function togglePublish(job: JobRow) {
    const res = await fetch(`/api/admin/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !job.published }),
    });
    const json = await res.json() as { data?: JobRow };
    if (json.data) setJobs((prev) => prev.map((j) => (j.id === job.id ? json.data! : j)));
  }

  return (
    <PortalPage
      title="Job Postings"
      description="Create and manage job and internship opportunities for portal users."
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90"
            >
              + New posting
            </button>
          )}
        </div>

        {creating && (
          <PortalCard>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">New job posting</h2>
            <JobEditor mode="create" onSave={handleCreate} onCancel={() => setCreating(false)} />
          </PortalCard>
        )}

        {loading && <p className="text-sm text-bio-text-muted">Loading…</p>}

        {!loading && jobs.length === 0 && !creating && (
          <PortalCard>
            <div className="flex flex-col items-center py-10 text-center">
              <Briefcase className="mb-3 h-8 w-8 text-bio-text-muted" />
              <p className="text-sm text-bio-text-muted">No job postings yet. Click <strong>+ New posting</strong> to create one.</p>
            </div>
          </PortalCard>
        )}

        {jobs.map((job) => (
          <PortalCard key={job.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-bio-text">{job.title}</span>
                  <span className="rounded-full border border-card-border px-2 py-0.5 text-xs text-bio-text-muted capitalize">
                    {job.type}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${job.published ? "bg-bio-green/10 text-bio-green" : "bg-amber-100 text-amber-700"}`}>
                    {job.published ? "Published" : "Draft"}
                  </span>
                  {job.visible_to?.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                      <Users className="h-3 w-3" /> Restricted
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-bio-text-muted">{job.company}{job.location ? ` · ${job.location}` : ""}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => setViewingAppsFor(job)}
                  className="text-xs text-bio-green hover:underline"
                >
                  Applications
                </button>
                <button
                  onClick={() => void togglePublish(job)}
                  className={`text-xs font-medium ${job.published ? "text-amber-600 hover:text-amber-700" : "text-bio-green hover:text-bio-green/80"}`}
                >
                  {job.published ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                  className="text-bio-text-muted hover:text-bio-green"
                >
                  {expandedId === job.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {expandedId === job.id && (
              <div className="mt-4 border-t border-card-border pt-4">
                <JobEditor
                  mode="edit"
                  initial={job}
                  onSave={(data) => handleUpdate(job.id, data)}
                  onCancel={() => setExpandedId(null)}
                  onDelete={() => handleDelete(job.id)}
                />
              </div>
            )}
          </PortalCard>
        ))}
      </div>

      {viewingAppsFor && (
        <JobApplicationsPanel
          job={viewingAppsFor}
          onClose={() => setViewingAppsFor(null)}
        />
      )}
    </PortalPage>
  );
}
