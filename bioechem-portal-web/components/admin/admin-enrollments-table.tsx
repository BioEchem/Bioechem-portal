"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

type EnrollmentRow = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  enrolled_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-bio-green/10 text-bio-green",
  rejected: "bg-red-100 text-red-600",
  dropped: "bg-bio-text-muted/10 text-bio-text-muted",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function AdminEnrollmentsTable({
  rows: initialRows,
  maxEnrollment,
}: {
  rows: EnrollmentRow[];
  maxEnrollment: number | null;
}) {
  const [rows, setRows] = useState(initialRows);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approvedCount = rows.filter((r) => r.status === "approved").length;
  const isFull = maxEnrollment != null && approvedCount >= maxEnrollment;

  async function review(id: string, status: "approved" | "rejected") {
    setPending(id + status);
    setError(null);
    try {
      const res = await fetch(`/api/admin/enrollments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json() as { data?: EnrollmentRow; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed."); return; }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch {
      setError("Network error.");
    } finally {
      setPending(null);
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-bio-text-muted">No enrollments yet.</p>;
  }

  return (
    <div>
      {maxEnrollment != null ? (
        <p className="mb-3 text-xs text-bio-text-muted">
          {approvedCount} / {maxEnrollment} spots filled
          {isFull ? (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
              Full
            </span>
          ) : null}
        </p>
      ) : null}

      {error ? (
        <p className="mb-3 text-sm text-red-600" role="alert">{error}</p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border text-left text-xs text-bio-text-muted">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Email</th>
              <th className="pb-2 pr-4 font-medium">Role</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Enrolled</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-3 pr-4 font-medium text-bio-text">
                  {row.profiles?.full_name ?? "—"}
                </td>
                <td className="py-3 pr-4 text-bio-text-muted">
                  {row.profiles?.email ?? "—"}
                </td>
                <td className="py-3 pr-4 capitalize text-bio-text-muted">
                  {row.role}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      STATUS_STYLES[row.status] ?? ""
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-bio-text-muted">
                  {formatDate(row.enrolled_at)}
                </td>
                <td className="py-3">
                  {row.status === "pending" ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void review(row.id, "approved")}
                        disabled={!!pending || (isFull)}
                        title={isFull ? "Cohort is full" : "Approve"}
                        className="flex items-center gap-1 rounded-md bg-bio-green/10 px-2 py-1 text-xs font-medium text-bio-green hover:bg-bio-green/20 disabled:opacity-40"
                      >
                        <Check className="h-3 w-3" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void review(row.id, "rejected")}
                        disabled={!!pending}
                        className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-100 disabled:opacity-40"
                      >
                        <X className="h-3 w-3" />
                        Reject
                      </button>
                    </div>
                  ) : row.status === "approved" ? (
                    <button
                      type="button"
                      onClick={() => void review(row.id, "rejected")}
                      disabled={!!pending}
                      className="text-xs text-bio-text-muted hover:text-red-500 disabled:opacity-40"
                    >
                      Revoke
                    </button>
                  ) : row.status === "rejected" ? (
                    <button
                      type="button"
                      onClick={() => void review(row.id, "approved")}
                      disabled={!!pending || isFull}
                      className="text-xs text-bio-text-muted hover:text-bio-green disabled:opacity-40"
                    >
                      Re-approve
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
