"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authInputClassName, authLabelClassName } from "@/components/auth/form-styles";
import { MultiSelectFilter } from "@/components/admin/multi-select-filter";
import { PortalCard } from "@/components/portal/portal-page";
import { getApprovalStatusLabel, getRoleLabel } from "@/lib/profile/display";
import type { ApprovalSuccessResponse } from "@/lib/admin/types";
import type { AuthApiError } from "@/lib/auth/types";

export type ApprovalUserRow = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string;
  schoolName: string;
  approvalStatus: "pending" | "approved" | "rejected";
  interestedInInternship: boolean;
  signedUp: string;
};

type ApprovalStatus = "pending" | "approved" | "rejected";

const PAGE_SIZE = 5;

export function AdminApprovalsView({ rows: initialRows }: { rows: ApprovalUserRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [internshipFilter, setInternshipFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [schoolFilter, setSchoolFilter] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [confirmingApproveId, setConfirmingApproveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const total = rows.length;
  const pendingCount = rows.filter((r) => r.approvalStatus === "pending").length;
  const approvedCount = rows.filter((r) => r.approvalStatus === "approved").length;
  const rejectedCount = rows.filter((r) => r.approvalStatus === "rejected").length;
  const internshipCount = rows.filter((r) => r.interestedInInternship).length;

  const roles = useMemo(
    () => [...new Set(rows.map((r) => r.role))].sort(),
    [rows],
  );
  const schools = useMemo(
    () => [...new Set(rows.map((r) => r.schoolName).filter((s) => s && s !== "—"))].sort(),
    [rows],
  );

  function toggleStatusStat(status: ApprovalStatus) {
    setStatusFilter((current) =>
      current.includes(status) ? current.filter((v) => v !== status) : [...current, status],
    );
    setPage(1);
  }

  function toggleInternshipStat() {
    setInternshipFilter((current) => (current.includes("yes") ? [] : ["yes"]));
    setPage(1);
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter.length > 0 && !statusFilter.includes(r.approvalStatus)) return false;
      if (internshipFilter.length > 0) {
        const wants = internshipFilter.includes("yes");
        const wantsNot = internshipFilter.includes("no");
        if (wants && !wantsNot && !r.interestedInInternship) return false;
        if (wantsNot && !wants && r.interestedInInternship) return false;
      }
      if (roleFilter.length > 0 && !roleFilter.includes(r.role)) return false;
      if (schoolFilter.length > 0 && !schoolFilter.includes(r.schoolName)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${r.fullName ?? ""} ${r.email ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, internshipFilter, roleFilter, schoolFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function startReject(profileId: string) {
    setError(null);
    setRejectingId(profileId);
    setRejectionReason("");
  }

  function cancelReject() {
    setRejectingId(null);
    setRejectionReason("");
  }

  async function handleAction(profileId: string, action: "approve" | "reject", reason?: string | null) {
    setError(null);
    setBusyId(profileId);
    try {
      const response = await fetch(`/api/admin/approvals/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(action === "reject" ? { rejectionReason: reason ?? null } : {}) }),
      });
      const data = (await response.json()) as ApprovalSuccessResponse | AuthApiError;
      if (!response.ok || !("ok" in data)) {
        setError("error" in data ? data.error.message : "Could not update user.");
        return;
      }
      setRows((current) =>
        current.map((r) =>
          r.id === profileId ? { ...r, approvalStatus: action === "approve" ? "approved" : "rejected" } : r,
        ),
      );
      setRejectingId(null);
      setRejectionReason("");
      setConfirmingApproveId(null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  const statCards: { key: ApprovalStatus | "all"; label: string; value: number }[] = [
    { key: "all", label: "Total users", value: total },
    { key: "pending", label: "Waiting approval", value: pendingCount },
    { key: "approved", label: "Approved", value: approvedCount },
    { key: "rejected", label: "Rejected", value: rejectedCount },
  ];

  const activeFilterCount =
    statusFilter.length + internshipFilter.length + roleFilter.length + schoolFilter.length;

  function clearAllFilters() {
    setStatusFilter([]);
    setInternshipFilter([]);
    setRoleFilter([]);
    setSchoolFilter([]);
    setSearch("");
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <PortalCard>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {statCards.map((s) => {
            const active = s.key === "all" ? statusFilter.length === 0 : statusFilter.includes(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => (s.key === "all" ? setStatusFilter([]) : toggleStatusStat(s.key))}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  active ? "border-bio-green bg-bio-green/10" : "border-card-border bg-bio-white hover:border-bio-green/40"
                }`}
              >
                <p className="text-xs uppercase tracking-wide text-bio-text-muted">{s.label}</p>
                <p className={`mt-1 text-2xl font-semibold ${active ? "text-bio-green" : "text-bio-text"}`}>
                  {s.value}
                </p>
              </button>
            );
          })}
          <button
            type="button"
            onClick={toggleInternshipStat}
            className={`rounded-lg border p-4 text-left transition-colors ${
              internshipFilter.includes("yes")
                ? "border-bio-green bg-bio-green/10"
                : "border-card-border bg-bio-white hover:border-bio-green/40"
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-bio-text-muted">Internship interest</p>
            <p className={`mt-1 text-2xl font-semibold ${internshipFilter.includes("yes") ? "text-bio-green" : "text-bio-text"}`}>
              {internshipCount}
            </p>
          </button>
        </div>
        {activeFilterCount > 0 && (
          <p className="mt-3 text-xs text-bio-text-muted">
            {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active.{" "}
            <button type="button" onClick={clearAllFilters} className="text-bio-green hover:underline">
              Clear all
            </button>
          </p>
        )}
      </PortalCard>

      <PortalCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">Users</h2>
          <span className="text-xs text-bio-text-muted">
            {filtered.length} {filtered.length === 1 ? "user" : "users"}
          </span>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search…"
            className="w-28 min-w-0 flex-1 rounded-lg border border-card-border bg-bio-white px-3 py-2 text-sm text-bio-text placeholder:text-bio-text-muted focus:border-bio-green focus:outline-none sm:max-w-[160px] sm:flex-none"
          />
          <MultiSelectFilter
            label="Status"
            selected={statusFilter}
            onChange={(next) => { setStatusFilter(next); setPage(1); }}
            options={[
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
          <MultiSelectFilter
            label="Role"
            selected={roleFilter}
            onChange={(next) => { setRoleFilter(next); setPage(1); }}
            options={roles.map((r) => ({ value: r, label: getRoleLabel(r) }))}
          />
          <MultiSelectFilter
            label="School"
            selected={schoolFilter}
            onChange={(next) => { setSchoolFilter(next); setPage(1); }}
            options={schools.map((s) => ({ value: s, label: s }))}
          />
          <MultiSelectFilter
            label="Internship"
            selected={internshipFilter}
            onChange={(next) => { setInternshipFilter(next); setPage(1); }}
            options={[
              { value: "yes", label: "Interested" },
              { value: "no", label: "Not interested" },
            ]}
          />
        </div>

        {error ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        {pageRows.length === 0 ? (
          <p className="text-sm text-bio-text-muted">No users match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-card-border text-bio-text-muted">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">School</th>
                  <th className="py-2 pr-4 font-medium">Internship</th>
                  <th className="py-2 pr-4 font-medium">Signed up</th>
                  <th className="py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const busy = busyId === r.id;
                  const rejecting = rejectingId === r.id;
                  const confirmingApprove = confirmingApproveId === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr className="border-b border-card-border/60 hover:bg-bio-mint/10 transition-colors">
                        <td className="py-2 pr-4 font-medium text-bio-text">{r.fullName || "—"}</td>
                        <td className="py-2 pr-4 text-bio-text-muted">{r.email || "—"}</td>
                        <td className="py-2 pr-4">{getRoleLabel(r.role)}</td>
                        <td className="py-2 pr-4">{getApprovalStatusLabel(r.approvalStatus)}</td>
                        <td className="py-2 pr-4">{r.schoolName}</td>
                        <td className="py-2 pr-4">
                          {r.interestedInInternship ? (
                            <span className="inline-flex items-center rounded-full bg-bio-green/10 px-2 py-0.5 text-xs font-medium text-bio-green">
                              Interested
                            </span>
                          ) : (
                            <span className="text-xs text-bio-text-muted">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-bio-text-muted">{r.signedUp}</td>
                        <td className="py-2">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {r.approvalStatus === "pending" ? (
                              <button
                                type="button"
                                disabled={busy || rejecting || confirmingApprove}
                                onClick={() => setConfirmingApproveId(r.id)}
                                className="inline-flex h-8 items-center rounded-lg bg-bio-green px-3 text-xs font-medium text-white transition-colors hover:bg-bio-green-dark disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Approve
                              </button>
                            ) : null}
                            {r.approvalStatus === "pending" ? (
                              <button
                                type="button"
                                disabled={busy || rejecting}
                                onClick={() => startReject(r.id)}
                                className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-800 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Reject
                              </button>
                            ) : null}
                            <Link
                              href={`/admin/users/${r.id}`}
                              className="whitespace-nowrap text-xs font-medium text-bio-green hover:underline"
                            >
                              View profile →
                            </Link>
                          </div>
                        </td>
                      </tr>
                      {confirmingApprove ? (
                        <tr className="border-b border-card-border/70 bg-bio-mint/20">
                          <td colSpan={8} className="px-2 py-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="text-sm text-bio-text">
                                Approve {r.fullName || r.email || "this user"}?
                              </p>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleAction(r.id, "approve")}
                                className="inline-flex h-8 items-center rounded-lg bg-bio-green px-3 text-xs font-medium text-white transition-colors hover:bg-bio-green-dark disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {busy ? "Saving…" : "Yes, approve"}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setConfirmingApproveId(null)}
                                className="inline-flex h-8 items-center rounded-lg border border-card-border bg-bio-white px-3 text-xs font-medium text-bio-text transition-colors hover:bg-bio-mint disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                      {rejecting ? (
                        <tr className="border-b border-card-border/70 bg-red-50/40">
                          <td colSpan={8} className="px-2 py-3">
                            <div className="max-w-xl space-y-3">
                              <p className="text-sm font-medium text-bio-text">
                                Reject {r.fullName || r.email || "this user"}?
                              </p>
                              <div>
                                <label htmlFor={`reject-reason-${r.id}`} className={authLabelClassName}>
                                  Reason (optional)
                                </label>
                                <textarea
                                  id={`reject-reason-${r.id}`}
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
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
                                  onClick={() => void handleAction(r.id, "reject", rejectionReason.trim() || null)}
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
        )}

        {pageCount > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-bio-text-muted">
              Page {currentPage} of {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-bio-text-muted hover:text-bio-text disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-bio-text-muted hover:text-bio-text disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </PortalCard>
    </div>
  );
}
