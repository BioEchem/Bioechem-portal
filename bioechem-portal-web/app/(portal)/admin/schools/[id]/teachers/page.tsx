import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { FilterBar } from "@/components/admin/filter-bar";
import { PaginationBar } from "@/components/admin/pagination-bar";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Teachers" };

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

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function SchoolTeachersPage({
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
    .eq("role", "teacher")
    .order("full_name", { nullsFirst: false });

  if (search.trim()) {
    query = query.or(`full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
  }
  if (status) {
    query = query.eq("approval_status", status);
  }

  const { data: teachers, count } = await query.range(offset, offset + PAGE_SIZE - 1);
  const totalCount = count ?? 0;

  // Fetch cohort teaching assignments for the returned teachers
  const teacherIds = (teachers ?? []).map((t) => t.id);
  const teachingMap: Record<string, number> = {};
  if (teacherIds.length > 0) {
    const { data: teachingRows } = await supabase
      .from("cohort_enrollments")
      .select("user_id, cohort_id")
      .in("user_id", teacherIds)
      .eq("role", "teacher")
      .eq("status", "approved");
    for (const row of teachingRows ?? []) {
      teachingMap[row.user_id] = (teachingMap[row.user_id] ?? 0) + 1;
    }
  }

  return (
    <PortalPage title="Teachers" description={school.name}>
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
              <h2 className="text-sm font-semibold text-bio-text">Teachers</h2>
              <p className="text-xs text-bio-text-muted">{totalCount} total</p>
            </div>
          </div>

          <FilterBar
            searchPlaceholder="Search by name or email…"
            statusOptions={STATUS_OPTIONS}
          />

          {(teachers ?? []).length === 0 ? (
            <p className="mt-6 text-sm text-bio-text-muted">
              {search || status ? "No teachers match your filters." : "No registered teachers for this school."}
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
                      <th className="pb-2 pr-4 font-medium">Teaching</th>
                      <th className="pb-2 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {(teachers ?? []).map((t) => (
                      <tr key={t.id}>
                        <td className="py-3 pr-4 font-medium text-bio-text">
                          {t.full_name ?? <span className="italic text-bio-text-muted">No name</span>}
                        </td>
                        <td className="py-3 pr-4 text-bio-text-muted">
                          {t.email ? (
                            <a href={`mailto:${t.email}`} className="hover:text-bio-green">{t.email}</a>
                          ) : "—"}
                        </td>
                        <td className="py-3 pr-4 text-bio-text-muted">{t.phone ?? "—"}</td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${APPROVAL_STYLES[t.approval_status] ?? "bg-gray-100 text-gray-600"}`}>
                            {t.approval_status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-bio-text-muted">
                          {teachingMap[t.id] ? (
                            <span className="text-bio-green font-medium">{teachingMap[t.id]} cohort{teachingMap[t.id] > 1 ? "s" : ""}</span>
                          ) : (
                            <span className="text-xs italic">None yet</span>
                          )}
                        </td>
                        <td className="py-3 text-bio-text-muted">{fmt(t.created_at)}</td>
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
