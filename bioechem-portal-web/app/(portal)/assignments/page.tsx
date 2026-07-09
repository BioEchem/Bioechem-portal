import type { Metadata } from "next";
import Link from "next/link";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { requireSession } from "@/lib/auth/session";

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

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AssignmentsPage() {
  const { supabase, user } = await requireSession({ requireApproved: true });

  // Get all cohorts the user is approved-enrolled in
  const { data: enrollments } = await supabase
    .from("cohort_enrollments")
    .select("cohort_id")
    .eq("user_id", user.id)
    .eq("status", "approved");

  const cohortIds = (enrollments ?? []).map((e: { cohort_id: string }) => e.cohort_id);

  let assignments: AssignmentRow[] = [];

  if (cohortIds.length > 0) {
    const { data } = await supabase
      .from("assignments")
      .select("id, due_at, max_points, cohort_id, module_items(id, title, module_id, published), cohorts(name), submissions!left(id, submitted_at)")
      .in("cohort_id", cohortIds)
      .eq("module_items.published", true)
      .eq("submissions.user_id", user.id)
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
          const href = item ? `/cohorts/${a.cohort_id}/assignments/${a.id}` : "#";
          const submitted = hasSubmission(a);
          const overdue = !submitted && a.due_at && new Date(a.due_at) < now;
          return (
            <div key={a.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <Link href={href} className="text-sm font-medium text-bio-text hover:text-bio-green">
                  {item?.title ?? "Untitled"}
                </Link>
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
