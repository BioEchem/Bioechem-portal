import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreQuizAnswers } from "@/lib/quiz/scoring";
import type { QuizAnswers, QuizQuestion } from "@/lib/quiz/types";

type Params = { params: Promise<{ id: string; quizId: string }> };

export async function POST(req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId, quizId } = await params;

  const { data: enrollment } = await supabase
    .from("cohort_enrollments")
    .select("role, status")
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (enrollment?.role !== "participant" || enrollment?.status !== "approved") {
    return NextResponse.json({ error: "Only enrolled participants can submit." }, { status: 403 });
  }

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, cohort_id, questions, due_at")
    .eq("id", quizId)
    .single();

  if (!quiz || quiz.cohort_id !== cohortId) {
    return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  }
  if (quiz.due_at && new Date(quiz.due_at) < new Date()) {
    return NextResponse.json({ error: "The deadline has passed." }, { status: 400 });
  }

  const body = await req.json() as Record<string, unknown>;
  const answers = (body.answers && typeof body.answers === "object" ? body.answers : {}) as QuizAnswers;

  const questions = (quiz.questions as unknown as QuizQuestion[]) ?? [];
  const { autoScore, needsGrading } = scoreQuizAnswers(questions, answers);

  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("quiz_submissions")
    .select("id")
    .eq("quiz_id", quizId)
    .eq("user_id", user.id)
    .maybeSingle();

  const row = {
    answers,
    auto_score: autoScore,
    needs_grading: needsGrading,
    // Resubmitting clears any prior manual grade — the free-text answers changed.
    manual_score: needsGrading ? null : undefined,
    graded_by: needsGrading ? null : undefined,
    graded_at: needsGrading ? null : undefined,
    updated_at: now,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("quiz_submissions")
      .update(row)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }

  const { data, error } = await supabase
    .from("quiz_submissions")
    .insert({
      quiz_id: quizId,
      user_id: user.id,
      cohort_id: cohortId,
      answers,
      auto_score: autoScore,
      needs_grading: needsGrading,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
