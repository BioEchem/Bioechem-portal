import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { ModuleItemList } from "@/components/cohorts/module-item-list";
import { CreateItemForm } from "@/components/cohorts/teacher/create-item-form";
import { requireSession } from "@/lib/auth/session";

type ItemRow = {
  id: string;
  type: string;
  title: string;
  content: string | null;
  file_url: string | null;
  external_url: string | null;
  position: number;
  published: boolean;
  created_at: string;
  assignments: { id: string; due_at: string | null; max_points: number; submission_type: string } | null;
  quizzes: { id: string; due_at: string | null; max_points: number; questions: unknown[] } | null;
};

/**
 * Renders a single module's items inline within the cohort page's Modules
 * tab, so the URL stays `/cohorts/[id]?tab=modules&moduleId=...` like every
 * other tab instead of navigating to a separate route.
 */
export async function ModuleDetailBody({
  cohortId,
  moduleId,
}: {
  cohortId: string;
  moduleId: string;
}) {
  const { supabase, user, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "approval_status, role",
  });

  const { data: mod } = await supabase
    .from("modules")
    .select("id, title, description, published, cohort_id")
    .eq("id", moduleId)
    .single();

  if (!mod || mod.cohort_id !== cohortId) notFound();

  const { data: enrollment } = await supabase
    .from("cohort_enrollments")
    .select("role, status")
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .maybeSingle();

  const isTeacher = enrollment?.role === "teacher" && enrollment?.status === "approved";
  const canManage = profile.role === "bioechem_admin" || isTeacher;
  const isEnrolled = enrollment?.status === "approved";

  if (!canManage && !isEnrolled) notFound();
  if (!canManage && !mod.published) notFound();

  let baseQuery = supabase
    .from("module_items")
    .select("id, type, title, content, file_url, external_url, position, published, created_at, assignments(id, due_at, max_points, submission_type), quizzes(id, due_at, max_points, questions)")
    .eq("module_id", moduleId)
    .eq("cohort_id", cohortId)
    .order("position");

  if (!canManage) baseQuery = baseQuery.eq("published", true);

  const { data: items } = await baseQuery.returns<ItemRow[]>();

  // Fetch user's submissions for this module's assignments
  const assignmentIds = (items ?? [])
    .filter((i) => i.type === "assignment" && i.assignments)
    .map((i) => i.assignments!.id);

  const submissionMap: Record<string, { submitted_at: string }> = {};
  if (assignmentIds.length > 0) {
    const { data: subs } = await supabase
      .from("submissions")
      .select("assignment_id, submitted_at")
      .eq("user_id", user.id)
      .in("assignment_id", assignmentIds);

    for (const s of subs ?? []) {
      submissionMap[s.assignment_id] = { submitted_at: s.submitted_at };
    }
  }

  // Fetch user's submissions for this module's quizzes
  const quizIds = (items ?? [])
    .filter((i) => i.type === "quiz" && i.quizzes)
    .map((i) => i.quizzes!.id);

  const quizSubmissionMap: Record<string, { submitted_at: string }> = {};
  if (quizIds.length > 0) {
    const { data: subs } = await supabase
      .from("quiz_submissions")
      .select("quiz_id, submitted_at")
      .eq("user_id", user.id)
      .in("quiz_id", quizIds);

    for (const s of subs ?? []) {
      quizSubmissionMap[s.quiz_id] = { submitted_at: s.submitted_at };
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/cohorts/${cohortId}?tab=modules`}
        className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
      >
        <ChevronLeft className="h-4 w-4" /> Back to modules
      </Link>

      <div>
        <h2 className="text-lg font-semibold text-bio-text">{mod.title}</h2>
        {mod.description ? <p className="mt-1 text-sm text-bio-text-muted">{mod.description}</p> : null}
      </div>

      <ModuleItemList
        cohortId={cohortId}
        moduleId={moduleId}
        items={items ?? []}
        submissionMap={submissionMap}
        quizSubmissionMap={quizSubmissionMap}
        canManage={canManage}
      />

      {canManage ? (
        <CreateItemForm cohortId={cohortId} moduleId={moduleId} />
      ) : null}
    </div>
  );
}
