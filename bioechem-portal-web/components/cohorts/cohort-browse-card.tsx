"use client";

import Link from "next/link";
import { Calendar, Users } from "lucide-react";
import { EnrollButton } from "./enroll-button";
import { formatShortDate as fmt } from "@/lib/format/date";

type Cohort = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  max_enrollment: number | null;
  enrollment_requires_approval: boolean;
  schools: { name: string } | null;
};

type Enrollment = { cohort_id: string; role: string; status: string } | null;

export function CohortBrowseCard({
  cohort,
  enrollment,
  href,
  readOnly = false,
}: {
  cohort: Cohort;
  enrollment: Enrollment;
  href?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-card-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex-1">
        <Link
          href={href ?? `/cohorts/${cohort.id}`}
          className="text-base font-semibold text-bio-text hover:text-bio-green"
        >
          {cohort.name}
        </Link>

        {cohort.schools ? (
          <p className="mt-0.5 text-xs text-bio-text-muted">{cohort.schools.name}</p>
        ) : (
          <p className="mt-0.5 text-xs text-bio-text-muted">BioEChem</p>
        )}

        {cohort.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-bio-text-muted">{cohort.description}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-bio-text-muted">
          {cohort.start_date ? (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {fmt(cohort.start_date)}
              {cohort.end_date ? ` – ${fmt(cohort.end_date)}` : ""}
            </span>
          ) : null}
          {cohort.max_enrollment ? (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {cohort.max_enrollment} max
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 border-t border-card-border pt-4">
        {readOnly ? (
          <div className="flex justify-end">
            {enrollment?.status === "approved" ? (
              <span className="rounded-full bg-bio-green/10 px-3 py-1 text-xs font-medium text-bio-green">Enrolled</span>
            ) : enrollment?.status === "pending" ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">Enrollment pending</span>
            ) : enrollment?.status === "rejected" ? (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-500">Enrollment rejected</span>
            ) : (
              <span className="rounded-full border border-card-border px-3 py-1 text-xs font-medium text-bio-text-muted">Not enrolled</span>
            )}
          </div>
        ) : (
          <EnrollButton
            cohortId={cohort.id}
            enrollment={enrollment ? { role: enrollment.role, status: enrollment.status } : null}
            requiresApproval={cohort.enrollment_requires_approval}
          />
        )}
      </div>
    </div>
  );
}
