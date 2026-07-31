import type { Metadata } from "next";
import Link from "next/link";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { AdminPreviewBanner } from "@/components/portal/admin-preview-banner";
import { requireSession } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getDisplayName } from "@/lib/profile/display";
import { formatShortDate as fmt } from "@/lib/format/date";

export const metadata: Metadata = { title: "Assignments" };

type AssignmentRow = {
  id: string;
  due_at: string | null;
  max_points: number | null;
  cohort_id: string;
  module_items: { id: string; title: string; module_id: string; published: boolean } | null;
  cohorts: { name: string } | null;
  submissions: { id: string; submitted_at: string }[] | null;
};

type TeacherAssignmentRow = {
  id: string;
  due_at: string | null;
  max_points: number | null;
  cohort_id: string;
  module_items: { id: string; title: string; published: boolean } | null;
  cohorts: { name: string } | null;
  submittedCount: number;
  ungradedCount: number;
};

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { as: asUserId } = await searchParams;
  const { supabase, user, profile } = await requireSession({ requireApproved: true });

  const isBioAdminViewing = profile.role === "bioechem_admin" && !!asUserId;
  const isTeacher = profile.role === "teacher";
  const targetUserId = isBioAdminViewing ? asUserId! : user.id;
  const dataClient = isBioAdminViewing ? (createServiceRoleClient() ?? supabase) : supabase;

  let targetName: string | null = null;
  if (isBioAdminViewing) {
    const { data: tp } = await dataClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", targetUserId)
      .maybeSingle<{ full_name: string | null; email: string | null }>();
    targetName = getDisplayName(tp?.full_name ?? null, tp?.email ?? null);
  }

  // ── Teacher view: assignments across cohorts they teach, with grading
  // status instead of a personal submit flow ──
  if (isTeacher) {
    const { data: enrollments } = await supabase
      .from("cohort_enrollments")
      .select("cohort_id")
      .eq("user_id", user.id)
      .eq("role", "teacher")
      .eq("status", "approved");

    const cohortIds = (enrollments ?? []).map((e: { cohort_id: string }) => e.cohort_id);

    let assignments: TeacherAssignmentRow[] = [];

    if (cohortIds.length > 0) {
      const { data } = await supabase
        .from("assignments")
        .select("id, due_at, max_points, cohort_id, module_items(id, title, published), cohorts(name)")
        .in("cohort_id", cohortIds)
        .eq("module_items.published", true)
        .order("due_at", { ascending: true, nullsFirst: false })
        .returns<Omit<TeacherAssignmentRow, "submittedCount" | "ungradedCount">[]>();

      const published = (data ?? []).filter((a) => a.module_items?.published);

      if (published.length > 0) {
        const assignmentIds = published.map((a) => a.id);
        const [{ data: allSubmissions }, { data: allGrades }] = await Promise.all([
          supabase.from("submissions").select("id, assignment_id").in("assignment_id", assignmentIds),
          supabase.from("grades").select("submission_id, assignment_id").in("assignment_id", assignmentIds),
        ]);
        const gradedSubmissionIds = new Set((allGrades ?? []).map((g) => g.submission_id as string));
        const submittedCountByAssignment = new Map<string, number>();
        const ungradedCountByAssignment = new Map<string, number>();
        for (const s of allSubmissions ?? []) {
          const aId = s.assignment_id as string;
          submittedCountByAssignment.set(aId, (submittedCountByAssignment.get(aId) ?? 0) + 1);
          if (!gradedSubmissionIds.has(s.id as string)) {
            ungradedCountByAssignment.set(aId, (ungradedCountByAssignment.get(aId) ?? 0) + 1);
          }
        }
        assignments = published.map((a) => ({
          ...a,
          submittedCount: submittedCountByAssignment.get(a.id) ?? 0,
          ungradedCount: ungradedCountByAssignment.get(a.id) ?? 0,
        }));
      }
    }

    const now = new Date();
    const upcoming = assignments.filter((a) => !a.due_at || new Date(a.due_at) >= now);
    const past = assignments.filter((a) => a.due_at && new Date(a.due_at) < now);

    function TeacherAssignmentList({ rows, isPast = false }: { rows: TeacherAssignmentRow[]; isPast?: boolean }) {
      return (
        <div className="divide-y divide-card-border">
          {rows.map((a) => {
            const item = a.module_items;
            const href = `/cohorts/${a.cohort_id}?tab=assignments&assignmentId=${a.id}`;
            return (
              <div key={a.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <Link href={href} className="text-sm font-medium text-bio-text hover:text-bio-green">
                    {item?.title ?? "Untitled"}
                  </Link>
                  <p className="text-xs text-bio-text-muted mt-0.5">
                    {a.cohorts?.name ?? "—"}
                    {a.due_at ? ` · Due ${fmt(a.due_at)}` : " · No due date"}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  {a.max_points != null && (
                    <span className="text-xs text-bio-text-muted">{a.max_points} pts</span>
                  )}
                  {a.ungradedCount > 0 ? (
                    <Link
                      href={href}
                      className="rounded-full bg-bio-green/10 px-2 py-0.5 text-xs font-medium text-bio-green hover:bg-bio-green/20"
                    >
                      {a.ungradedCount} to grade
                    </Link>
                  ) : a.submittedCount > 0 ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      All graded
                    </span>
                  ) : isPast ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                      Overdue
                    </span>
                  ) : (
                    <span className="rounded-full bg-card-border/40 px-2 py-0.5 text-xs font-medium text-bio-text-muted">
                      No submissions yet
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <PortalPage title="Assignments" description="Assignments across the cohorts you teach.">
        <div className="space-y-4">
          <PortalCard>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
                Upcoming ({upcoming.length})
              </h2>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-bio-text-muted">No upcoming assignments.</p>
            ) : (
              <TeacherAssignmentList rows={upcoming} />
            )}
          </PortalCard>

          <PortalCard>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-text-muted">
                Past ({past.length})
              </h2>
            </div>
            {past.length === 0 ? (
              <p className="text-sm text-bio-text-muted">No past assignments.</p>
            ) : (
              <TeacherAssignmentList rows={past} isPast />
            )}
          </PortalCard>
        </div>
      </PortalPage>
    );
  }

  // ── Participant (and admin-preview-as-participant) view: personal
  // submit-your-work list ──

  // Get all cohorts the target user is approved-enrolled in
  const { data: enrollments } = await dataClient
    .from("cohort_enrollments")
    .select("cohort_id")
    .eq("user_id", targetUserId)
    .eq("status", "approved");

  const cohortIds = (enrollments ?? []).map((e: { cohort_id: string }) => e.cohort_id);

  let assignments: AssignmentRow[] = [];

  if (cohortIds.length > 0) {
    const { data } = await dataClient
      .from("assignments")
      .select("id, due_at, max_points, cohort_id, module_items(id, title, module_id, published), cohorts(name), submissions!left(id, submitted_at)")
      .in("cohort_id", cohortIds)
      .eq("module_items.published", true)
      .eq("submissions.user_id", targetUserId)
      .order("due_at", { ascending: true, nullsFirst: false })
      .returns<AssignmentRow[]>();

    assignments = (data ?? []).filter((a) => a.module_items?.published);
  }

  const now = new Date();
  const hasSubmission = (a: AssignmentRow) => Array.isArray(a.submissions) ? a.submissions.length > 0 : !!a.submissions;
  const upcoming = assignments.filter(
    (a) => !hasSubmission(a) && (!a.due_at || new Date(a.due_at) >= now)
  );
  const past = assignments.filter(
    (a) => hasSubmission(a) || (a.due_at && new Date(a.due_at) < now)
  );

  function AssignmentList({ rows }: { rows: AssignmentRow[] }) {
    return (
      <div className="divide-y divide-card-border">
        {rows.map((a) => {
          const item = a.module_items;
          const href = item ? `/cohorts/${a.cohort_id}?tab=assignments&assignmentId=${a.id}` : "#";
          const submitted = hasSubmission(a);
          const overdue = !submitted && a.due_at && new Date(a.due_at) < now;
          return (
            <div key={a.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                {isBioAdminViewing ? (
                  <p className="text-sm font-medium text-bio-text">{item?.title ?? "Untitled"}</p>
                ) : (
                  <Link href={href} className="text-sm font-medium text-bio-text hover:text-bio-green">
                    {item?.title ?? "Untitled"}
                  </Link>
                )}
                <p className="text-xs text-bio-text-muted mt-0.5">
                  {a.cohorts?.name ?? "—"}
                  {a.due_at
                    ? ` · Due ${fmt(a.due_at)}`
                    : " · No due date"}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                {a.max_points != null && (
                  <span className="text-xs text-bio-text-muted">{a.max_points} pts</span>
                )}
                {submitted ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Submitted
                  </span>
                ) : overdue ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                    Overdue
                  </span>
                ) : isBioAdminViewing ? (
                  <span className="rounded-full bg-bio-green/10 px-2 py-0.5 text-xs font-medium text-bio-green">
                    Not submitted
                  </span>
                ) : (
                  <Link
                    href={href}
                    className="rounded-full bg-bio-green/10 px-2 py-0.5 text-xs font-medium text-bio-green hover:bg-bio-green/20"
                  >
                    Submit
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <PortalPage title="Assignments" description="All assignments across your enrolled cohorts.">
      <div className="space-y-4">
        {isBioAdminViewing && targetName ? (
          <AdminPreviewBanner targetName={targetName} targetUserId={asUserId!} action="assignments" />
        ) : null}

        <PortalCard>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
              Upcoming ({upcoming.length})
            </h2>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-bio-text-muted">No upcoming assignments.</p>
          ) : (
            <AssignmentList rows={upcoming} />
          )}
        </PortalCard>

        <PortalCard>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-text-muted">
              Past ({past.length})
            </h2>
          </div>
          {past.length === 0 ? (
            <p className="text-sm text-bio-text-muted">No past assignments.</p>
          ) : (
            <AssignmentList rows={past} />
          )}
        </PortalCard>
      </div>
    </PortalPage>
  );
}
