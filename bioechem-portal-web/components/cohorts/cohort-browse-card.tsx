"use client";

import Link from "next/link";
import { Calendar, Users } from "lucide-react";
import { EnrollButton } from "./enroll-button";

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

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function CohortBrowseCard({
  cohort,
  enrollment,
}: {
  cohort: Cohort;
  enrollment: Enrollment;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-card-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex-1">
        <Link
          href={`/cohorts/${cohort.id}`}
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
        <EnrollButton
          cohortId={cohort.id}
          enrollment={enrollment ? { role: enrollment.role, status: enrollment.status } : null}
          requiresApproval={cohort.enrollment_requires_approval}
        />
      </div>
    </div>
  );
}
