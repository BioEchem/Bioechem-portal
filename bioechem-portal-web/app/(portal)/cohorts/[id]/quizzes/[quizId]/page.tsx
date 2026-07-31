import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { CohortTabs } from "@/components/cohorts/cohort-tabs";
import { QuizTakeForm } from "@/components/cohorts/quiz-take-form";
import { QuizSubmissionsReviewList } from "@/components/cohorts/teacher/quiz-submissions-review-list";
import { requireSession } from "@/lib/auth/session";
import { buildCohortTabs } from "@/lib/cohorts/tabs";
import type { QuizAnswers, QuizQuestion } from "@/lib/quiz/types";

export const metadata: Metadata = { title: "Quiz" };

type SubmissionRow = {
  id: string;
  user_id: string;
  answers: QuizAnswers;
  auto_score: number;
  manual_score: number | null;
  needs_grading: boolean;
  feedback: string | null;
  submitted_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const { id: cohortId, quizId } = await params;

  const { supabase, user, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "approval_status, role",
  });

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, due_at, questions, max_points, instructions, cohort_id, module_items(id, title, module_id, published)")
    .eq("id", quizId)
    .single();

  if (!quiz || quiz.cohort_id !== cohortId) notFound();

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

  type ItemShape = { id: string; title: string; module_id: string; published: boolean };
  const rawItem = quiz.module_items as unknown;
  const item: ItemShape | null = Array.isArray(rawItem) ? (rawItem[0] ?? null) : (rawItem as ItemShape | null);

  if (!canManage && !item?.published) notFound();

  const questions = (quiz.questions as unknown as QuizQuestion[]) ?? [];

  let mySubmission: {
    id: string;
    answers: QuizAnswers;
    auto_score: number;
    manual_score: number | null;
    needs_grading: boolean;
    feedback: string | null;
    submitted_at: string;
  } | null = null;
  if (isParticipant) {
    const { data } = await supabase
      .from("quiz_submissions")
      .select("id, answers, auto_score, manual_score, needs_grading, feedback, submitted_at")
      .eq("quiz_id", quizId)
      .eq("user_id", user.id)
      .maybeSingle();
    mySubmission = data;
  }

  let submissions: SubmissionRow[] = [];
  if (canManage) {
    const { data } = await supabase
      .from("quiz_submissions")
      .select("id, user_id, answers, auto_score, manual_score, needs_grading, feedback, submitted_at, profiles(full_name, email)")
      .eq("quiz_id", quizId)
      .order("submitted_at")
      .returns<SubmissionRow[]>();
    submissions = data ?? [];
  }

  const isOverdue = quiz.due_at ? new Date(quiz.due_at) < new Date() : false;

  const tabs = buildCohortTabs({
    canViewContent: canManage || isParticipant,
    canManage,
    isApprovedEnrolled: isParticipant,
    isTeacher,
  });

  return (
    <PortalPage title={item?.title ?? "Quiz"}>
      <div className="space-y-4">
        <CohortTabs tabs={tabs} activeTab="modules" cohortId={cohortId} />

        <Link
          href={`/cohorts/${cohortId}?tab=modules&moduleId=${item?.module_id}`}
          className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ChevronLeft className="h-4 w-4" /> Back to module
        </Link>

        <PortalCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-bio-text">{item?.title}</h2>
              {quiz.due_at ? (
                <p className={`mt-1 text-sm ${isOverdue ? "text-red-500" : "text-bio-text-muted"}`}>
                  Due: {new Date(quiz.due_at).toLocaleString("en-US", {
                    month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
                  })}
                  {isOverdue ? " (past due)" : ""}
                </p>
              ) : null}
            </div>
            <span className="rounded-full bg-bio-mint/40 px-3 py-1 text-sm font-medium text-bio-green">
              {questions.length} question{questions.length === 1 ? "" : "s"} · {quiz.max_points} pts
            </span>
          </div>

          {quiz.instructions ? (
            <div className="mt-3 rounded-lg bg-bio-mint/20 p-3 text-sm text-bio-text whitespace-pre-wrap">
              {quiz.instructions}
            </div>
          ) : null}
        </PortalCard>

        {isParticipant ? (
          <PortalCard>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-green">
              {isOverdue ? "Your results" : mySubmission ? "Your results" : "Take quiz"}
            </h3>
            <QuizTakeForm
              cohortId={cohortId}
              quizId={quizId}
              questions={questions}
              maxPoints={quiz.max_points}
              existingSubmission={mySubmission}
              isOverdue={isOverdue}
            />
          </PortalCard>
        ) : null}

        {canManage ? (
          <PortalCard>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">
              Submissions ({submissions.length})
            </h3>
            <QuizSubmissionsReviewList
              cohortId={cohortId}
              quizId={quizId}
              questions={questions}
              maxPoints={quiz.max_points}
              submissions={submissions}
            />
          </PortalCard>
        ) : null}
      </div>
    </PortalPage>
  );
}
