"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";

import { authInputClassName, authLabelClassName } from "@/components/auth/form-styles";
import type { ApprovalSuccessResponse } from "@/lib/admin/types";
import type { AuthApiError } from "@/lib/auth/types";

export type PendingApprovalRow = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string;
  schoolName: string;
  signedUp: string;
};

type PendingApprovalsTableProps = {
  rows: PendingApprovalRow[];
};

export function PendingApprovalsTable({ rows: initialRows }: PendingApprovalsTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function startReject(profileId: string) {
    setError(null);
    setRejectingId(profileId);
    setRejectionReason("");
  }

  function cancelReject() {
    setRejectingId(null);
    setRejectionReason("");
  }

  async function handleAction(
    profileId: string,
    action: "approve" | "reject",
    reason?: string | null,
  ) {
    setError(null);
    setBusyId(profileId);

    try {
      const response = await fetch(`/api/admin/approvals/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "reject" ? { rejectionReason: reason ?? null } : {}),
        }),
      });

      const data = (await response.json()) as ApprovalSuccessResponse | AuthApiError;

      if (!response.ok || !("ok" in data)) {
        setError("error" in data ? data.error.message : "Could not update user.");
        return;
      }

      setRows((current) => current.filter((row) => row.id !== profileId));
      setRejectingId(null);
      setRejectionReason("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-bio-text-muted">No users are waiting right now.</p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-bio-text-muted">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Role</th>
              <th className="py-2 pr-4 font-medium">School</th>
              <th className="py-2 pr-4 font-medium">Signed up</th>
              <th className="py-2 pr-4 font-medium">Actions</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const busy = busyId === item.id;
              const rejecting = rejectingId === item.id;

              return (
                <Fragment key={item.id}>
                  <tr className="border-b border-card-border/70">
                    <td className="py-2 pr-4">{item.fullName || "-"}</td>
                    <td className="py-2 pr-4">{item.email || "-"}</td>
                    <td className="py-2 pr-4">{item.role}</td>
                    <td className="py-2 pr-4">{item.schoolName}</td>
                    <td className="py-2 pr-4">{item.signedUp}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || rejecting}
                          onClick={() => handleAction(item.id, "approve")}
                          className="inline-flex h-8 items-center rounded-lg bg-bio-green px-3 text-xs font-medium text-white transition-colors hover:bg-bio-green-dark disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy && !rejecting ? "Saving…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          disabled={busy || rejecting}
                          onClick={() => startReject(item.id)}
                          className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-800 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                    <td className="py-2">
                      <Link
                        href={`/admin/users/${item.id}`}
                        className="text-xs font-medium text-bio-green hover:underline whitespace-nowrap"
                      >
                        View profile →
                      </Link>
                    </td>
                  </tr>
                  {rejecting ? (
                    <tr className="border-b border-card-border/70 bg-red-50/40">
                      <td colSpan={7} className="px-2 py-3">
                        <div className="max-w-xl space-y-3">
                          <p className="text-sm font-medium text-bio-text">
                            Reject {item.fullName || item.email || "this user"}?
                          </p>
                          <div>
                            <label
                              htmlFor={`reject-reason-${item.id}`}
                              className={authLabelClassName}
                            >
                              Reason (optional)
                            </label>
                            <textarea
                              id={`reject-reason-${item.id}`}
                              value={rejectionReason}
                              onChange={(event) => setRejectionReason(event.target.value)}
                              disabled={busy}
                              rows={2}
                              placeholder="e.g. School affiliation could not be verified"
                              className={`${authInputClassName} mt-1 resize-y`}
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleAction(
                                  item.id,
                                  "reject",
                                  rejectionReason.trim() || null,
                                )
                              }
                              className="inline-flex h-8 items-center rounded-lg bg-red-800 px-3 text-xs font-medium text-white transition-colors hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busy ? "Rejecting…" : "Confirm reject"}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={cancelReject}
                              className="inline-flex h-8 items-center rounded-lg border border-card-border bg-bio-white px-3 text-xs font-medium text-bio-text transition-colors hover:bg-bio-mint disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
