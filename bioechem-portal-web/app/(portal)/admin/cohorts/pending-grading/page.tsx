import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { requireSession } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/format/date";

export const metadata: Metadata = { title: "Pending grading" };

type AssignmentRow = {
  id: string;
  cohort_id: string;
  module_item_id: string;
  cohorts: { name: string } | null;
  module_items: { title: string } | null;
};

type SubmissionRow = {
  id: string;
  assignment_id: string;
  user_id: string;
  submitted_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

export default async function AdminPendingGradingPage() {
  const { supabase, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "approval_status, role, school_id",
  });

  const isBioAdmin = profile.role === "bioechem_admin";
  const isSchoolAdmin = profile.role === "school_admin";

  if (!isBioAdmin && !isSchoolAdmin) {
    return (
      <PortalPage title="Pending grading">
        <PortalCard>
          <p className="text-sm text-bio-text-muted">Access denied.</p>
        </PortalCard>
      </PortalPage>
    );
  }

  const schoolAdminProfile = profile as typeof profile & { school_id: string | null };
  if (isSchoolAdmin && !isBioAdmin && !schoolAdminProfile.school_id) {
    // Never fall back to an unfiltered query — that would leak every
    // school's pending grading queue to an admin with no school on file.
    return (
      <PortalPage title="Pending grading">
        <PortalCard>
          <p className="text-sm text-bio-text-muted">
            Your account isn&apos;t linked to a school yet. Contact BioEchem support.
          </p>
        </PortalCard>
      </PortalPage>
    );
  }

  let assignmentsQuery = supabase
    .from("assignments")
    .select("id, cohort_id, module_item_id, cohorts(name, school_id), module_items(title)")
    .eq("requires_grading", true);

  if (isSchoolAdmin && !isBioAdmin) {
    assignmentsQuery = assignmentsQuery.eq("cohorts.school_id", schoolAdminProfile.school_id as string);
  }

  const { data: assignments } = await assignmentsQuery.returns<
    (AssignmentRow & { cohorts: (AssignmentRow["cohorts"] & { school_id: string | null }) | null })[]
  >();

  const gradableAssignments = (assignments ?? []).filter((a) => a.cohorts != null);
  const assignmentIds = gradableAssignments.map((a) => a.id);

  let pendingRows: {
    submissionId: string;
    studentName: string | null;
    studentEmail: string | null;
    assignmentTitle: string;
    cohortId: string;
    cohortName: string;
    assignmentId: string;
    submittedAt: string;
  }[] = [];

  if (assignmentIds.length > 0) {
    const [{ data: submissions }, { data: grades }] = await Promise.all([
      supabase
        .from("submissions")
        .select("id, assignment_id, user_id, submitted_at, profiles(full_name, email)")
        .in("assignment_id", assignmentIds)
        .order("submitted_at", { ascending: true })
        .returns<SubmissionRow[]>(),
      supabase
        .from("grades")
        .select("submission_id")
        .in("assignment_id", assignmentIds),
    ]);

    const gradedIds = new Set((grades ?? []).map((g) => g.submission_id as string));
    const assignmentById = new Map(gradableAssignments.map((a) => [a.id, a]));

    pendingRows = (submissions ?? [])
      .filter((s) => !gradedIds.has(s.id))
      .map((s) => {
        const a = assignmentById.get(s.assignment_id);
        return {
          submissionId: s.id,
          studentName: s.profiles?.full_name ?? null,
          studentEmail: s.profiles?.email ?? null,
          assignmentTitle: a?.module_items?.title ?? "Untitled assignment",
          cohortId: a?.cohort_id ?? "",
          cohortName: a?.cohorts?.name ?? "Unknown cohort",
          assignmentId: s.assignment_id,
          submittedAt: s.submitted_at,
        };
      })
      .filter((r) => r.cohortId);
  }

  return (
    <PortalPage
      title="Pending grading"
      description="Every ungraded submission across every cohort, in one place."
    >
      <div className="space-y-4">
        <Link
          href="/admin/cohorts"
          className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ChevronLeft className="h-4 w-4" /> All cohorts
        </Link>

        {pendingRows.length === 0 ? (
          <PortalCard>
            <div className="py-8 text-center">
              <p className="text-sm text-bio-text-muted">No submissions are waiting for grading right now.</p>
            </div>
          </PortalCard>
        ) : (
          <div className="space-y-3">
            {pendingRows.map((r) => (
              <PortalCard key={r.submissionId}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-bio-text">
                      {r.studentName ?? r.studentEmail ?? "Unknown student"}
                    </p>
                    <p className="mt-0.5 text-sm text-bio-text-muted">
                      Submitted <span className="font-medium text-bio-text">{r.assignmentTitle}</span> in{" "}
                      <span className="font-medium text-bio-text">{r.cohortName}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-bio-text-muted">
                      Submitted {formatShortDate(r.submittedAt)}
                    </p>
                  </div>
                  <Link
                    href={`/cohorts/${r.cohortId}?tab=assignments&assignmentId=${r.assignmentId}`}
                    className="shrink-0 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90"
                  >
                    Grade now →
                  </Link>
                </div>
              </PortalCard>
            ))}
          </div>
        )}
      </div>
    </PortalPage>
  );
}
