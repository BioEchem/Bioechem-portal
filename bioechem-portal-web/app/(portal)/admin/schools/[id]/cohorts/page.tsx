import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, GraduationCap } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { FilterBar } from "@/components/admin/filter-bar";
import { PaginationBar } from "@/components/admin/pagination-bar";
import { requireSession } from "@/lib/auth/session";
import { formatShortDate as fmt } from "@/lib/format/date";

export const metadata: Metadata = { title: "Cohorts" };

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-bio-green/10 text-bio-green",
  draft: "bg-amber-100 text-amber-700",
  archived: "bg-bio-text-muted/10 text-bio-text-muted",
};

export default async function SchoolCohortsPage({
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
    .from("cohorts")
    .select("id, name, status, start_date, end_date, max_enrollment, is_active, created_at", { count: "exact" })
    .eq("school_id", id)
    .order("name");

  if (search.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data: cohorts, count } = await query.range(offset, offset + PAGE_SIZE - 1);
  const totalCount = count ?? 0;

  // Fetch enrollment counts for displayed cohorts
  const cohortIds = (cohorts ?? []).map((c) => c.id);
  const enrollmentCounts: Record<string, { students: number; teachers: number }> = {};
  if (cohortIds.length > 0) {
    const { data: enrollRows } = await supabase
      .from("cohort_enrollments")
      .select("cohort_id, role")
      .in("cohort_id", cohortIds)
      .eq("status", "approved");
    for (const row of enrollRows ?? []) {
      if (!enrollmentCounts[row.cohort_id]) enrollmentCounts[row.cohort_id] = { students: 0, teachers: 0 };
      if (row.role === "participant") enrollmentCounts[row.cohort_id].students++;
      else if (row.role === "teacher") enrollmentCounts[row.cohort_id].teachers++;
    }
  }

  return (
    <PortalPage title="Cohorts" description={school.name}>
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
              <h2 className="text-sm font-semibold text-bio-text">Cohorts</h2>
              <p className="text-xs text-bio-text-muted">{totalCount} total</p>
            </div>
            <Link
              href={`/admin/cohorts/new?schoolId=${id}`}
              className="rounded-lg bg-bio-green px-3 py-1.5 text-xs font-medium text-white hover:bg-bio-green/90"
            >
              + Add cohort
            </Link>
          </div>

          <FilterBar
            searchPlaceholder="Search by cohort name…"
            statusOptions={STATUS_OPTIONS}
          />

          {(cohorts ?? []).length === 0 ? (
            <p className="mt-6 text-sm text-bio-text-muted">
              {search || status ? "No cohorts match your filters." : "No cohorts for this school yet."}
            </p>
          ) : (
            <>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border text-left text-xs text-bio-text-muted">
                      <th className="pb-2 pr-4 font-medium">Name</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Dates</th>
                      <th className="pb-2 pr-4 font-medium">Students</th>
                      <th className="pb-2 pr-4 font-medium">Teachers</th>
                      <th className="pb-2 pr-4 font-medium">Capacity</th>
                      <th className="pb-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {(cohorts ?? []).map((cohort) => {
                      const counts = enrollmentCounts[cohort.id] ?? { students: 0, teachers: 0 };
                      return (
                        <tr key={cohort.id}>
                          <td className="py-3 pr-4">
                            <Link
                              href={`/admin/cohorts/${cohort.id}?back=/admin/schools/${id}/cohorts`}
                              className="flex items-center gap-2 font-medium text-bio-text hover:text-bio-green"
                            >
                              <GraduationCap className="h-4 w-4 shrink-0 text-bio-green/60" />
                              {cohort.name}
                            </Link>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[cohort.status] ?? "bg-gray-100 text-gray-600"}`}>
                              {cohort.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            {cohort.start_date || cohort.end_date ? (
                              <span className="text-bio-text-muted">
                                {cohort.start_date ? fmt(cohort.start_date) : "TBD"}
                                {" → "}
                                {cohort.end_date ? fmt(cohort.end_date) : "TBD"}
                              </span>
                            ) : (
                              <span className="text-xs italic text-bio-text-muted/60">No dates set</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-bio-text-muted">{counts.students}</td>
                          <td className="py-3 pr-4 text-bio-text-muted">{counts.teachers}</td>
                          <td className="py-3 pr-4 text-bio-text-muted">
                            {cohort.max_enrollment ?? "Unlimited"}
                          </td>
                          <td className="py-3 text-right">
                            <Link
                              href={`/admin/cohorts/${cohort.id}/edit`}
                              className="text-xs text-bio-text-muted hover:text-bio-green"
                            >
                              Edit
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
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
