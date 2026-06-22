import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { AssignmentSubmitForm } from "@/components/cohorts/assignment-submit-form";
import { SubmissionsReviewList } from "@/components/cohorts/teacher/submissions-review-list";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Assignment" };

type SubmissionRow = {
  id: string;
  user_id: string;
  submission_text: string | null;
  file_url: string | null;
  filename: string | null;
  submitted_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
  grades: { points_earned: number | null; feedback: string | null; graded_at: string } | null;
};

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
}) {
  const { id: cohortId, assignmentId } = await params;

  const { supabase, user, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "approval_status, role",
  });

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, due_at, max_points, submission_type, instructions, cohort_id, module_items(id, title, content, module_id, published)")
    .eq("id", assignmentId)
    .single();

  if (!assignment || assignment.cohort_id !== cohortId) notFound();

  const { data: enrollment } = await supabase
    .from("cohort_enrollments")
    .select("role, status")
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .maybeSingle();

  const isTeacher = enrollment?.role === "teacher" && enrollment?.status === "approved";
  const canManage = profile.role === "bioechem_admin" || isTeacher;
  const isParticipant = enrollment?.role === "participant" && enrollment?.status === "approved";

  if (!canManage && !isParticipant) notFound();

  type ItemShape = { id: string; title: string; content: string | null; module_id: string; published: boolean };
  const rawItem = assignment.module_items as unknown;
  const item: ItemShape | null = Array.isArray(rawItem) ? (rawItem[0] ?? null) : (rawItem as ItemShape | null);

  if (!canManage && !item?.published) notFound();

  // Participant: fetch own submission
  let mySubmission: { id: string; submission_text: string | null; file_url: string | null; filename: string | null; submitted_at: string } | null = null;
  if (isParticipant) {
    const { data } = await supabase
      .from("submissions")
      .select("id, submission_text, file_url, filename, submitted_at")
      .eq("assignment_id", assignmentId)
      .eq("user_id", user.id)
      .maybeSingle();
    mySubmission = data;
  }

  // Fetch own grade
  let myGrade: { points_earned: number | null; feedback: string | null; graded_at: string } | null = null;
  if (isParticipant && mySubmission) {
    const { data } = await supabase
      .from("grades")
      .select("points_earned, feedback, graded_at")
      .eq("submission_id", mySubmission.id)
      .maybeSingle();
    myGrade = data;
  }

  // Teacher: fetch all submissions
  let submissions: SubmissionRow[] = [];
  if (canManage) {
    const { data } = await supabase
      .from("submissions")
      .select("id, user_id, submission_text, file_url, filename, submitted_at, profiles(full_name, email), grades(points_earned, feedback, graded_at)")
      .eq("assignment_id", assignmentId)
      .order("submitted_at")
      .returns<SubmissionRow[]>();
    submissions = data ?? [];
  }

  const isOverdue = assignment.due_at ? new Date(assignment.due_at) < new Date() : false;

  return (
    <PortalPage title={item?.title ?? "Assignment"}>
      <div className="space-y-4">
        <Link
          href={`/cohorts/${cohortId}/modules/${item?.module_id}`}
          className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ChevronLeft className="h-4 w-4" /> Back to module
        </Link>

        {/* Assignment details */}
        <PortalCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-bio-text">{item?.title}</h2>
              {assignment.due_at ? (
                <p className={`mt-1 text-sm ${isOverdue ? "text-red-500" : "text-bio-text-muted"}`}>
                  Due: {new Date(assignment.due_at).toLocaleString("en-US", {
                    month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
                  })}
                  {isOverdue ? " (past due)" : ""}
                </p>
              ) : null}
            </div>
            <span className="rounded-full bg-bio-mint/40 px-3 py-1 text-sm font-medium text-bio-green">
              {assignment.max_points} pts
            </span>
          </div>

          {item?.content ? (
            <div className="mt-4 text-sm text-bio-text whitespace-pre-wrap">{item.content}</div>
          ) : null}
          {assignment.instructions ? (
            <div className="mt-3 rounded-lg bg-bio-mint/20 p-3 text-sm text-bio-text whitespace-pre-wrap">
              {assignment.instructions}
            </div>
          ) : null}
        </PortalCard>

        {/* Participant: submission form + grade */}
        {isParticipant ? (
          <>
            {myGrade ? (
              <PortalCard>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-green">
                  Your grade
                </h3>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold text-bio-green">
                    {myGrade.points_earned ?? "—"} / {assignment.max_points}
                  </span>
                </div>
                {myGrade.feedback ? (
                  <p className="mt-3 rounded-lg bg-bio-mint/20 p-3 text-sm text-bio-text">
                    {myGrade.feedback}
                  </p>
                ) : null}
              </PortalCard>
            ) : null}

            <PortalCard>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-green">
                {mySubmission ? "Update submission" : "Submit assignment"}
              </h3>
              <AssignmentSubmitForm
                cohortId={cohortId}
                assignmentId={assignmentId}
                submissionType={assignment.submission_type}
                existingSubmission={mySubmission}
              />
            </PortalCard>
          </>
        ) : null}

        {/* Teacher: submissions list */}
        {canManage ? (
          <PortalCard>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">
              Submissions ({submissions.length})
            </h3>
            <SubmissionsReviewList
              cohortId={cohortId}
              submissions={submissions}
              maxPoints={assignment.max_points}
            />
          </PortalCard>
        ) : null}
      </div>
    </PortalPage>
  );
}
