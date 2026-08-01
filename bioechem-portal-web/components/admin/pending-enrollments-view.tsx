"use client";

import Link from "next/link";
import { useState } from "react";
import { PortalCard } from "@/components/portal/portal-page";

export type PendingEnrollmentRow = {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  cohortRole: "participant" | "teacher";
  cohortId: string;
  cohortName: string;
  schoolName: string | null;
  enrolledAt: string;
};

export function PendingEnrollmentsView({ rows: initialRows }: { rows: PendingEnrollmentRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(id: string, status: "approved" | "rejected") {
    setBusyId(id + status);
    setError(null);
    try {
      const res = await fetch(`/api/admin/enrollments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not update enrollment.");
        return;
      }
      setRows((current) => current.filter((r) => r.id !== id));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <PortalCard>
        <div className="py-8 text-center">
          <p className="text-sm text-bio-text-muted">No cohort enrollments are waiting for approval right now.</p>
        </div>
      </PortalCard>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {rows.map((r) => {
        const busyApprove = busyId === r.id + "approved";
        const busyReject = busyId === r.id + "rejected";
        const busy = busyApprove || busyReject;
        return (
          <PortalCard key={r.id}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-bio-text">{r.name ?? r.email ?? "Unknown user"}</span>
                  <span className="rounded-full bg-bio-mint/40 px-2 py-0.5 text-xs font-medium text-bio-green capitalize">
                    {r.cohortRole}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-bio-text-muted">
                  Requesting to join{" "}
                  <Link href={`/cohorts/${r.cohortId}?tab=roster`} className="font-medium text-bio-green hover:underline">
                    {r.cohortName}
                  </Link>
                  {r.schoolName ? ` · ${r.schoolName}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-bio-text-muted">{r.email}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void review(r.id, "approved")}
                  className="inline-flex h-8 items-center rounded-lg bg-bio-green px-3 text-xs font-medium text-white transition-colors hover:bg-bio-green-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyApprove ? "Saving…" : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void review(r.id, "rejected")}
                  className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-800 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyReject ? "Saving…" : "Reject"}
                </button>
              </div>
            </div>
          </PortalCard>
        );
      })}
    </div>
  );
}
