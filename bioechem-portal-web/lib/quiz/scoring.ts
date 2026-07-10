import type { QuizAnswers, QuizQuestion } from "@/lib/quiz/types";

export type ScoreResult = {
  autoScore: number;
  needsGrading: boolean;
};

/** Auto-grades multiple_choice/true_false answers; short_answer questions are excluded (flagged for manual grading). */
export function scoreQuizAnswers(questions: QuizQuestion[], answers: QuizAnswers): ScoreResult {
  let autoScore = 0;
  let needsGrading = false;

  for (const q of questions) {
    if (q.type === "short_answer") {
      needsGrading = true;
      continue;
    }
    const given = answers[q.id]?.trim();
    if (given && q.correctAnswer && given === q.correctAnswer) {
      autoScore += q.points;
    }
  }

  return { autoScore, needsGrading };
}
