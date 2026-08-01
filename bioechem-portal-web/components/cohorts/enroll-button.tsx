"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Enrollment = { role: string; status: string } | null;

export function EnrollButton({
  cohortId,
  enrollment,
  requiresApproval,
}: {
  cohortId: string;
  enrollment: Enrollment;
  requiresApproval: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnroll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "participant" }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to enroll."); return; }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDrop() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/enroll`, { method: "DELETE" });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to drop."); return; }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  const status = enrollment?.status;

  return (
    <div className="flex flex-col items-end gap-1">
      {status === "approved" ? (
        <button
          type="button"
          onClick={() => void handleDrop()}
          disabled={loading}
          className="rounded-lg border border-card-border px-4 py-1.5 text-sm text-bio-text-muted hover:border-red-300 hover:text-red-500 disabled:opacity-40"
        >
          {loading ? "Dropping…" : "Drop cohort"}
        </button>
      ) : status === "pending" ? (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            Enrollment pending
          </span>
          <button
            type="button"
            onClick={() => void handleDrop()}
            disabled={loading}
            className="text-xs text-bio-text-muted hover:text-red-500 disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      ) : status === "rejected" ? (
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-500">
          Enrollment rejected
        </span>
      ) : (
        <button
          type="button"
          onClick={() => void handleEnroll()}
          disabled={loading}
          className="rounded-lg bg-bio-green px-4 py-1.5 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-40"
        >
          {loading ? "Enrolling…" : requiresApproval ? "Request to enroll" : "Enroll"}
        </button>
      )}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
