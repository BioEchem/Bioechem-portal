"use client";

import { useState } from "react";
import { Briefcase, Building2, Calendar, CheckCircle, Clock, MapPin, X } from "lucide-react";
import { PortalCard } from "@/components/portal/portal-page";
import { formatShortDate as fmt } from "@/lib/format/date";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  type: string;
  description: string;
  requirements: string | null;
  deadline: string | null;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  internship: "Internship",
  contract: "Contract",
};

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-50 text-amber-700 border-amber-200",
  reviewed: "bg-blue-50 text-blue-700 border-blue-200",
  accepted: "bg-bio-green/10 text-bio-green border-bio-green/30",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

function ApplyModal({ job, onClose, onApplied }: { job: Job; onClose: () => void; onApplied: () => void }) {
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_letter: coverLetter }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to apply.");
      onApplied();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-bio-text">Apply — {job.title}</h2>
            <p className="text-sm text-bio-text-muted">{job.company}</p>
          </div>
          <button onClick={onClose} className="text-bio-text-muted hover:text-bio-text">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-bio-text-muted">
              Cover letter <span className="font-normal">(optional)</span>
            </label>
            <textarea
              rows={6}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Briefly describe why you're a great fit…"
              className="w-full rounded-lg border border-card-border px-3 py-2 text-sm text-bio-text placeholder:text-bio-text-muted focus:border-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/20"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-bio-green px-5 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit application"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function JobsBoard({
  jobs: initial,
  appliedMap: initialAppliedMap,
}: {
  jobs: Job[];
  appliedMap: Record<string, string>;
}) {
  const [jobs] = useState(initial);
  const [appliedMap, setAppliedMap] = useState(initialAppliedMap);
  const [applyingTo, setApplyingTo] = useState<Job | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function withdraw(jobId: string) {
    if (!confirm("Withdraw your application?")) return;
    const res = await fetch(`/api/jobs/${jobId}/apply`, { method: "DELETE" });
    if (res.ok) {
      setAppliedMap((prev) => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });
    }
  }

  if (jobs.length === 0) {
    return (
      <PortalCard>
        <div className="flex flex-col items-center py-12 text-center">
          <Briefcase className="mb-3 h-10 w-10 text-bio-text-muted" />
          <p className="text-sm font-medium text-bio-text">No open positions right now</p>
          <p className="mt-1 text-xs text-bio-text-muted">Check back soon for new opportunities.</p>
        </div>
      </PortalCard>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {jobs.map((job) => {
          const appStatus = appliedMap[job.id];
          const isExpanded = expanded === job.id;

          return (
            <PortalCard key={job.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-bio-text">{job.title}</h3>
                    <span className="rounded-full border border-card-border px-2 py-0.5 text-xs text-bio-text-muted">
                      {TYPE_LABELS[job.type] ?? job.type}
                    </span>
                    {appStatus && (
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[appStatus] ?? STATUS_STYLES.pending}`}>
                        <CheckCircle className="h-3 w-3" />
                        Applied · {appStatus.charAt(0).toUpperCase() + appStatus.slice(1)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-bio-text-muted">
                    <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{job.company}</span>
                    {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                    {job.deadline && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Deadline: {fmt(job.deadline)}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Posted {fmt(job.created_at)}</span>
                  </div>

                  {/* Description preview / full */}
                  <p className={`mt-2 text-sm text-bio-text ${isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
                    {job.description}
                  </p>
                  {job.requirements && isExpanded && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-bio-text-muted uppercase tracking-wide mb-1">Requirements</p>
                      <p className="text-sm text-bio-text whitespace-pre-wrap">{job.requirements}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : job.id)}
                    className="mt-1 text-xs text-bio-green hover:underline"
                  >
                    {isExpanded ? "Show less" : "Read more"}
                  </button>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
                  {appStatus ? (
                    <button
                      onClick={() => void withdraw(job.id)}
                      className="text-xs text-bio-text-muted hover:text-red-600"
                    >
                      Withdraw
                    </button>
                  ) : (
                    <button
                      onClick={() => setApplyingTo(job)}
                      className="rounded-lg bg-bio-green px-4 py-1.5 text-sm font-medium text-white hover:bg-bio-green/90"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            </PortalCard>
          );
        })}
      </div>

      {applyingTo && (
        <ApplyModal
          job={applyingTo}
          onClose={() => setApplyingTo(null)}
          onApplied={() => setAppliedMap((prev) => ({ ...prev, [applyingTo.id]: "pending" }))}
        />
      )}
    </>
  );
}
