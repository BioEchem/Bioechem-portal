"use client";

import Link from "next/link";

import { PortalCard } from "@/components/portal/portal-page";
import {
  DashboardQuickLinks,
  DashboardShell,
  DashboardTable,
} from "@/components/portal/dashboard-ui";
import {
  buildDashboardProfileFields,
  type DashboardUserContext,
} from "@/lib/dashboard/types";
import { PORTAL_ROUTES } from "@/lib/portal/routes";

type TeacherStats = {
  classCount: number;
  studentCount: number;
  assignmentCount: number;
  pendingGradingCount: number;
};

type TeacherCurriculumEntry = {
  cohortId: string;
  cohortName: string;
  moduleCount: number;
};

type TeacherDashboardProps = {
  user: DashboardUserContext;
  stats: TeacherStats;
  curriculum: TeacherCurriculumEntry[];
  /** Set when a bioechem_admin is previewing this dashboard as another user. */
  asUserId?: string;
};

export function TeacherDashboard({ user, stats, curriculum, asUserId }: TeacherDashboardProps) {
  const hasClasses = stats.classCount > 0;
  const asQuery = asUserId ? `?as=${asUserId}` : "";

  return (
    <DashboardShell
      user={user}
      subtitle="Your teaching dashboard — manage classes, assignments, and student progress."
      profileFields={buildDashboardProfileFields(user, { includeSchoolCohort: true })}
      isBioAdminViewing={!!asUserId}
    >
      {/* Compact stat pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Classes", value: stats.classCount },
          { label: "Students", value: stats.studentCount },
          { label: "Assignments", value: stats.assignmentCount },
          { label: "Pending grading", value: stats.pendingGradingCount, highlight: stats.pendingGradingCount > 0 },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border px-5 py-3 text-center ${
              s.highlight ? "border-amber-300 bg-amber-50" : "border-card-border bg-bio-white"
            }`}
          >
            <p className={`text-2xl font-bold ${s.highlight ? "text-amber-700" : "text-bio-green"}`}>{s.value}</p>
            <p className="text-xs text-bio-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {hasClasses ? (
        <DashboardQuickLinks
          links={[
            {
              label: "My courses",
              href: `${PORTAL_ROUTES.cohorts}${asQuery}`,
              description: "View your enrolled classes and course content.",
            },
            {
              label: "Assignments",
              href: `${PORTAL_ROUTES.assignments}${asQuery}`,
              description: "Create tasks and review student submissions.",
            },
            {
              label: "Messaging",
              href: PORTAL_ROUTES.messaging,
              description: "Communicate with students and school staff.",
            },
          ]}
        />
      ) : (
        <div className="rounded-xl border border-card-border bg-bio-white p-6 text-center">
          <p className="text-sm font-medium text-bio-text">You're not enrolled in any classes yet</p>
          <p className="mt-1 text-sm text-bio-text-muted">
            Browse available courses and enroll to start teaching.
          </p>
          <Link
            href={`${PORTAL_ROUTES.cohorts}${asQuery}`}
            className="mt-4 inline-flex rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90"
          >
            Browse courses
          </Link>
        </div>
      )}

      {hasClasses ? (
        <PortalCard>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
            Curriculum overview
          </h2>
          <div className="mt-4">
            <DashboardTable
              headers={["Cohort", "Published modules"]}
              rows={curriculum.map((entry) => [entry.cohortName, String(entry.moduleCount)])}
              emptyMessage="No published modules yet for your classes."
            />
          </div>
        </PortalCard>
      ) : null}
    </DashboardShell>
  );
}
