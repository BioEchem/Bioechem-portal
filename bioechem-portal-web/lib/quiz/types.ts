export type QuizQuestionType = "multiple_choice" | "true_false" | "short_answer";

export type QuizQuestion = {
  id: string;
  type: QuizQuestionType;
  text: string;
  points: number;
  options?: string[]; // multiple_choice only
  correctAnswer?: string; // multiple_choice (matches an option) or true_false ("true" | "false"); absent for short_answer
};

/** Student answers, keyed by question id. Values are strings (option text, "true"/"false", or free text). */
export type QuizAnswers = Record<string, string>;

export function emptyQuestion(type: QuizQuestionType = "multiple_choice"): QuizQuestion {
  return {
    id: crypto.randomUUID(),
    type,
    text: "",
    points: 1,
    options: type === "multiple_choice" ? ["", ""] : undefined,
    correctAnswer: undefined,
  };
}

export function totalPoints(questions: QuizQuestion[]): number {
  return questions.reduce((sum, q) => sum + (Number.isFinite(q.points) ? q.points : 0), 0);
}

export function hasFreeTextQuestions(questions: QuizQuestion[]): boolean {
  return questions.some((q) => q.type === "short_answer");
}
