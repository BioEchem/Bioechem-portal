"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { formatShortDate as computeFormatDate } from "@/lib/format/date";

type CohortRow = {
  id: string;
  name: string;
  status: string;
  max_enrollment: number | null;
  enrollment_requires_approval: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  schools?: { id: string; name: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-bio-green/10 text-bio-green",
  draft: "bg-amber-100 text-amber-700",
  archived: "bg-bio-text-muted/10 text-bio-text-muted",
};

function formatDate(d: string | null) {
  return d ? computeFormatDate(d) : "—";
}

export function AdminCohortsTable({
  rows,
  showSchool,
}: {
  rows: CohortRow[];
  showSchool: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-bio-text-muted">No cohorts found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-card-border text-left text-xs text-bio-text-muted">
            <th className="pb-2 pr-4 font-medium">Name</th>
            {showSchool ? <th className="pb-2 pr-4 font-medium">School</th> : null}
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 pr-4 font-medium">Dates</th>
            <th className="pb-2 pr-4 font-medium">Capacity</th>
            <th className="pb-2 pr-4 font-medium">Approval</th>
            <th className="pb-2 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {rows.map((cohort) => (
            <tr key={cohort.id} className="group">
              <td className="py-3 pr-4">
                <Link href={`/admin/cohorts/${cohort.id}?back=/admin/cohorts`} className="flex items-center gap-2 hover:text-bio-green">
                  <GraduationCap className="h-4 w-4 shrink-0 text-bio-green/60" />
                  <span className="font-medium text-bio-text hover:text-bio-green">{cohort.name}</span>
                </Link>
              </td>
              {showSchool ? (
                <td className="py-3 pr-4 text-bio-text-muted">
                  {cohort.schools?.name ?? <span className="italic">Standalone</span>}
                </td>
              ) : null}
              <td className="py-3 pr-4">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    STATUS_STYLES[cohort.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {cohort.status}
                </span>
              </td>
              <td className="py-3 pr-4">
                {cohort.start_date || cohort.end_date ? (
                  <span className="text-bio-text-muted">
                    {cohort.start_date ? formatDate(cohort.start_date) : "TBD"}
                    {" – "}
                    {cohort.end_date ? formatDate(cohort.end_date) : "TBD"}
                  </span>
                ) : (
                  <span className="text-xs italic text-bio-text-muted/60">No dates set</span>
                )}
              </td>
              <td className="py-3 pr-4 text-bio-text-muted">
                {cohort.max_enrollment ?? "Unlimited"}
              </td>
              <td className="py-3 pr-4 text-bio-text-muted">
                {cohort.enrollment_requires_approval ? "Required" : "Auto"}
              </td>
              <td className="py-3 text-right">
                <Link
                  href={`/admin/cohorts/${cohort.id}/edit`}
                  className="text-xs font-medium text-bio-text-muted hover:text-bio-green"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
