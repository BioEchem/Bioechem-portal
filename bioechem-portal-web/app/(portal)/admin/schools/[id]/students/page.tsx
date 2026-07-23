import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { FilterBar } from "@/components/admin/filter-bar";
import { PaginationBar } from "@/components/admin/pagination-bar";
import { requireSession } from "@/lib/auth/session";
import { formatShortDate as fmt } from "@/lib/format/date";

export const metadata: Metadata = { title: "Students" };

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
];

const APPROVAL_STYLES: Record<string, string> = {
  approved: "bg-bio-green/10 text-bio-green",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-500",
};

export default async function SchoolStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const { id } = await params;
  const { search = "", status = "", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { supabase } = await requireSession({
    requireApproved: true,
    requiredRole: "bioechem_admin",
  });

  const { data: school } = await supabase
    .from("schools")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!school) notFound();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, approval_status, created_at", { count: "exact" })
    .eq("school_id", id)
    .eq("role", "participant")
    .order("full_name", { nullsFirst: false });

  if (search.trim()) {
    query = query.or(`full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
  }
  if (status) {
    query = query.eq("approval_status", status);
  }

  const { data: students, count } = await query.range(offset, offset + PAGE_SIZE - 1);

  const totalCount = count ?? 0;

  return (
    <PortalPage title="Students" description={school.name}>
      <div className="space-y-4">
        <Link
          href={`/admin/schools/${id}`}
          className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ChevronLeft className="h-4 w-4" /> Back to {school.name}
        </Link>

        <PortalCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-bio-text">Registered students</h2>
              <p className="text-xs text-bio-text-muted">{totalCount} total</p>
            </div>
          </div>

          <FilterBar
            searchPlaceholder="Search by name or email…"
            statusOptions={STATUS_OPTIONS}
          />

          {(students ?? []).length === 0 ? (
            <p className="mt-6 text-sm text-bio-text-muted">
              {search || status ? "No students match your filters." : "No registered students for this school."}
            </p>
          ) : (
            <>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border text-left text-xs text-bio-text-muted">
                      <th className="pb-2 pr-4 font-medium">Name</th>
                      <th className="pb-2 pr-4 font-medium">Email</th>
                      <th className="pb-2 pr-4 font-medium">Phone</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {(students ?? []).map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 pr-4 font-medium text-bio-text">
                          {s.full_name ?? <span className="italic text-bio-text-muted">No name</span>}
                        </td>
                        <td className="py-3 pr-4 text-bio-text-muted">
                          {s.email ? (
                            <a href={`mailto:${s.email}`} className="hover:text-bio-green">{s.email}</a>
                          ) : "—"}
                        </td>
                        <td className="py-3 pr-4 text-bio-text-muted">
                          {s.phone ?? "—"}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${APPROVAL_STYLES[s.approval_status] ?? "bg-gray-100 text-gray-600"}`}>
                            {s.approval_status}
                          </span>
                        </td>
                        <td className="py-3 text-bio-text-muted">
                          {fmt(s.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={page} totalCount={totalCount} pageSize={PAGE_SIZE} />
            </>
          )}
        </PortalCard>
      </div>
    </PortalPage>
  );
}
