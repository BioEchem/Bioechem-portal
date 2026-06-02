import type { Metadata } from "next";
import Link from "next/link";

import { AUTH_ROUTES } from "@/lib/auth/routes";
import { requireSession } from "@/lib/auth/session";

type AdminProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  other_school_name: string | null;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
  schools: { name: string } | { name: string }[] | null;
};

export const metadata: Metadata = {
  title: "Admin dashboard",
};

function getSchoolName(row: AdminProfileRow): string {
  if (row.other_school_name) return row.other_school_name;
  const school = row.schools;
  if (!school) return "-";
  if (Array.isArray(school)) return school[0]?.name ?? "-";
  return school.name ?? "-";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireSession({
    requireApproved: true,
    requiredRole: "bioechem_admin",
  });

  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, other_school_name, approval_status, created_at, schools(name)")
    .order("created_at", { ascending: false })
    .returns<AdminProfileRow[]>();

  const rows = users ?? [];
  const pending = rows.filter((item) => item.approval_status === "pending");
  const approved = rows.filter((item) => item.approval_status === "approved");

  return (
    <main className="bio-pattern flex flex-1 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="rounded-xl border border-card-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-semibold text-bio-green">Admin dashboard</h1>
          <p className="mt-2 text-sm text-bio-text-muted">
            Review signups, approvals, and all portal users in one place.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-card-border bg-bio-white p-4">
              <p className="text-xs uppercase tracking-wide text-bio-text-muted">
                Total users
              </p>
              <p className="mt-1 text-2xl font-semibold text-bio-green">
                {rows.length}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs uppercase tracking-wide text-amber-900">
                Waiting approval
              </p>
              <p className="mt-1 text-2xl font-semibold text-amber-900">
                {pending.length}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-900">
                Approved
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-900">
                {approved.length}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-card-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-bio-green">Waiting for approval</h2>
            <span className="text-xs text-bio-text-muted">{pending.length} pending</span>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-bio-text-muted">No users are waiting right now.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-card-border text-bio-text-muted">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    <th className="py-2 pr-4 font-medium">School</th>
                    <th className="py-2 pr-4 font-medium">Signed up</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((item) => (
                    <tr key={item.id} className="border-b border-card-border/70">
                      <td className="py-2 pr-4">{item.full_name || "-"}</td>
                      <td className="py-2 pr-4">{item.email || "-"}</td>
                      <td className="py-2 pr-4">{item.role}</td>
                      <td className="py-2 pr-4">{getSchoolName(item)}</td>
                      <td className="py-2 pr-4">{formatDate(item.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-card-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-bio-green">All users</h2>
            <span className="text-xs text-bio-text-muted">Latest first</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-card-border text-bio-text-muted">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">School</th>
                  <th className="py-2 pr-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-b border-card-border/70">
                    <td className="py-2 pr-4">{item.full_name || "-"}</td>
                    <td className="py-2 pr-4">{item.email || "-"}</td>
                    <td className="py-2 pr-4">{item.role}</td>
                    <td className="py-2 pr-4">{item.approval_status}</td>
                    <td className="py-2 pr-4">{getSchoolName(item)}</td>
                    <td className="py-2 pr-4">{formatDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Link href={AUTH_ROUTES.dashboard} className="bio-btn-secondary inline-flex">
              Back to user dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
