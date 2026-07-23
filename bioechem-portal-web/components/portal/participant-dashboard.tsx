import Link from "next/link";
import { Clock } from "lucide-react";

import {
  DashboardQuickLinks,
  DashboardShell,
} from "@/components/portal/dashboard-ui";
import { PortalCard } from "@/components/portal/portal-page";
import { ProfileCompletionPrompt } from "@/components/profile/profile-completion-prompt";
import {
  buildDashboardProfileFields,
  type DashboardUserContext,
} from "@/lib/dashboard/types";
import type { ParticipantDashboardData } from "@/lib/dashboard/participant-data";
import type { ProfileCompletionStatus } from "@/lib/profile/completion";
import { getRoleConfig } from "@/lib/portal/role-config";
import { PORTAL_ROUTES } from "@/lib/portal/routes";
import { formatShortDate as fmt } from "@/lib/format/date";

type ParticipantDashboardProps = {
  user: DashboardUserContext;
  profileCompletion: ProfileCompletionStatus;
  pendingCohortNames?: string[];
  data: ParticipantDashboardData;
};

export function ParticipantDashboard({
  user,
  profileCompletion,
  pendingCohortNames = [],
  data,
}: ParticipantDashboardProps) {
  const { welcomeSubtitle } = getRoleConfig(user.role);
  const { courses, grades } = data;

  return (
    <DashboardShell
      user={user}
      subtitle={welcomeSubtitle}
      profileFields={buildDashboardProfileFields(user, { includeSchoolCohort: true })}
    >
      <ProfileCompletionPrompt variant="dashboard" status={profileCompletion} />
      {pendingCohortNames.length > 0 ? (
        <PortalCard className="border-amber-300 bg-amber-50 shadow-none">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                {pendingCohortNames.length === 1
                  ? `Your request to join "${pendingCohortNames[0]}" is pending approval`
                  : "Your class enrollment requests are pending approval"}
              </p>
              <p className="mt-1 text-sm text-amber-900">
                {pendingCohortNames.length > 1
                  ? `Waiting on approval for: ${pendingCohortNames.join(", ")}. `
                  : ""}
                An admin will review your request. You&apos;ll get access to course
                materials once it&apos;s approved.
              </p>
            </div>
          </div>
        </PortalCard>
      ) : null}
      <DashboardQuickLinks
        links={[
          {
            label: "My courses",
            href: PORTAL_ROUTES.cohorts,
            description: "View enrolled BioEchem courses and lesson materials.",
          },
          {
            label: "Assignments",
            href: PORTAL_ROUTES.assignments,
            description: "See upcoming tasks and submit your work.",
          },
          {
            label: "Messaging",
            href: PORTAL_ROUTES.messaging,
            description: "Message teachers and classmates.",
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PortalCard>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">My courses</h2>
          {courses.length === 0 ? (
            <p className="mt-3 text-sm text-bio-text-muted">
              You are not enrolled in any courses yet. Once an admin approves your enrollment, it will appear here.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {courses.map((c) => (
                <li key={c.cohortId}>
                  <Link
                    href={`/cohorts/${c.cohortId}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-card-border px-3 py-2.5 transition-colors hover:border-bio-green/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-bio-text">{c.name}</p>
                      {c.schoolName && <p className="truncate text-xs text-bio-text-muted">{c.schoolName}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-bio-green/10 px-2 py-0.5 text-xs font-medium text-bio-green capitalize">
                      {c.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PortalCard>

        <PortalCard>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">Grades &amp; progress</h2>
          {grades.gradedCount === 0 ? (
            <p className="mt-3 text-sm text-bio-text-muted">
              Your grades and assignment feedback will show here once your work has been graded.
            </p>
          ) : (
            <>
              <div className="mt-3 flex items-center gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-bio-text-muted">Overall</p>
                  <p className="mt-1 text-2xl font-bold text-bio-green">
                    {grades.overallPct != null ? `${grades.overallPct}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-bio-text-muted">Letter grade</p>
                  <p className="mt-1 text-2xl font-bold text-bio-green">{grades.letterGrade ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-bio-text-muted">Graded</p>
                  <p className="mt-1 text-2xl font-bold text-bio-green">{grades.gradedCount}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {grades.recent.map((g, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg border border-card-border px-3 py-2 text-sm">
                    <span className="truncate text-bio-text">{g.title}</span>
                    <span className="shrink-0 text-bio-text-muted">
                      {g.earned ?? "—"} / {g.max} · {fmt(g.gradedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </PortalCard>
      </div>
    </DashboardShell>
  );
}
