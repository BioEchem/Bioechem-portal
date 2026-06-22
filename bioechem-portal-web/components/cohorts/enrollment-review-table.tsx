"use client";

import { useState } from "react";
import { Check, X, ShieldOff } from "lucide-react";

export type ReviewableEnrollment = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  enrolled_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  profiles: { full_name: string | null; email: string | null } | null;
};

export type ReviewerNames = Record<string, string>;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-bio-green/10 text-bio-green",
  rejected: "bg-red-100 text-red-600",
  dropped: "bg-bio-text-muted/10 text-bio-text-muted",
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function EnrollmentReviewTable({
  title,
  rows: initialRows,
  reviewerNames,
  canManage,
  maxEnrollment,
}: {
  title: string;
  rows: ReviewableEnrollment[];
  reviewerNames: ReviewerNames;
  canManage: boolean;
  maxEnrollment?: number | null;
}) {
  const [rows, setRows] = useState(initialRows);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approvedCount = rows.filter((r) => r.status === "approved").length;
  const isFull = maxEnrollment != null && approvedCount >= maxEnrollment;

  async function review(id: string, status: "approved" | "rejected") {
    setActing(id + status);
    setError(null);
    try {
      const res = await fetch(`/api/admin/enrollments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Failed."); return; }
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
    } catch {
      setError("Network error.");
    } finally {
      setActing(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-green">{title}</h3>
        <p className="text-sm text-bio-text-muted">No enrollments yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-bio-green">{title}</h3>
        {maxEnrollment != null ? (
          <span className="text-xs text-bio-text-muted">
            {approvedCount} / {maxEnrollment} spots
            {isFull ? (
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">Full</span>
            ) : null}
          </span>
        ) : null}
      </div>

      {error ? <p className="mb-3 text-sm text-red-500">{error}</p> : null}

      <div className="divide-y divide-card-border">
        {rows.map((row) => {
          const reviewerName = row.reviewed_by ? (reviewerNames[row.reviewed_by] ?? "Admin") : null;
          const isActing = !!acting;

          return (
            <div key={row.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-bio-text">
                    {row.profiles?.full_name ?? row.profiles?.email ?? "Unknown"}
                  </p>
                  <p className="text-xs text-bio-text-muted">{row.profiles?.email}</p>
                  <p className="mt-0.5 text-xs text-bio-text-muted">
                    Enrolled {fmt(row.enrolled_at)}
                  </p>
                  {reviewerName && row.reviewed_at ? (
                    <p className={`mt-0.5 text-xs ${row.status === "approved" ? "text-bio-green" : "text-red-500"}`}>
                      {row.status === "approved" ? "Approved" : "Rejected"} by {reviewerName} on {fmt(row.reviewed_at)}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[row.status] ?? ""}`}>
                    {row.status}
                  </span>

                  {canManage ? (
                    <div className="flex items-center gap-1.5">
                      {row.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void review(row.id, "approved")}
                            disabled={isActing || isFull}
                            title={isFull ? "Cohort is full" : "Approve"}
                            className="flex items-center gap-1 rounded-md bg-bio-green/10 px-2 py-1 text-xs font-medium text-bio-green hover:bg-bio-green/20 disabled:opacity-40"
                          >
                            <Check className="h-3 w-3" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void review(row.id, "rejected")}
                            disabled={isActing}
                            className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-100 disabled:opacity-40"
                          >
                            <X className="h-3 w-3" /> Reject
                          </button>
                        </>
                      ) : row.status === "approved" ? (
                        <button
                          type="button"
                          onClick={() => void review(row.id, "rejected")}
                          disabled={isActing}
                          title="Revoke enrollment access"
                          className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-100 disabled:opacity-40"
                        >
                          <ShieldOff className="h-3 w-3" /> Revoke
                        </button>
                      ) : row.status === "rejected" ? (
                        <button
                          type="button"
                          onClick={() => void review(row.id, "approved")}
                          disabled={isActing || isFull}
                          title={isFull ? "Cohort is full" : "Re-approve"}
                          className="flex items-center gap-1 rounded-md bg-bio-green/10 px-2 py-1 text-xs font-medium text-bio-green hover:bg-bio-green/20 disabled:opacity-40"
                        >
                          <Check className="h-3 w-3" /> Re-approve
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
