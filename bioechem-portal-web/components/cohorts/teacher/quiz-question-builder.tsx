"use client";

import { Plus, Trash2 } from "lucide-react";
import { emptyQuestion, totalPoints, type QuizQuestion, type QuizQuestionType } from "@/lib/quiz/types";

const QUESTION_TYPES: { value: QuizQuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short answer" },
];

const inputClass =
  "w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text placeholder:text-bio-text-muted focus:outline-none focus:ring-2 focus:ring-bio-green/50";

export function QuizQuestionBuilder({
  questions,
  onChange,
}: {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
}) {
  function updateQuestion(index: number, updates: Partial<QuizQuestion>) {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...updates } : q)));
  }

  function changeType(index: number, type: QuizQuestionType) {
    const next = emptyQuestion(type);
    updateQuestion(index, {
      type,
      options: type === "multiple_choice" ? ["", ""] : undefined,
      correctAnswer: type === "short_answer" ? undefined : next.correctAnswer,
    });
  }

  function addQuestion() {
    onChange([...questions, emptyQuestion()]);
  }

  function removeQuestion(index: number) {
    onChange(questions.filter((_, i) => i !== index));
  }

  function updateOption(qIndex: number, optIndex: number, value: string) {
    const q = questions[qIndex];
    const options = [...(q.options ?? [])];
    const prevValue = options[optIndex];
    options[optIndex] = value;
    // Keep correctAnswer pointing at the (renamed) option's text
    const correctAnswer = q.correctAnswer === prevValue ? value : q.correctAnswer;
    updateQuestion(qIndex, { options, correctAnswer });
  }

  function addOption(qIndex: number) {
    const q = questions[qIndex];
    updateQuestion(qIndex, { options: [...(q.options ?? []), ""] });
  }

  function removeOption(qIndex: number, optIndex: number) {
    const q = questions[qIndex];
    const removed = q.options?.[optIndex];
    const options = (q.options ?? []).filter((_, i) => i !== optIndex);
    updateQuestion(qIndex, {
      options,
      correctAnswer: q.correctAnswer === removed ? undefined : q.correctAnswer,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-bio-text-muted">
          {questions.length} question{questions.length === 1 ? "" : "s"} · {totalPoints(questions)} pts total
        </p>
        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center gap-1 text-xs font-medium text-bio-green hover:text-bio-green/80"
        >
          <Plus className="h-3.5 w-3.5" /> Add question
        </button>
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-bio-text-muted italic">No questions yet — add at least one.</p>
      ) : null}

      {questions.map((q, qIndex) => (
        <div key={q.id} className="space-y-3 rounded-lg border border-card-border bg-bio-surface p-3">
          <div className="flex items-start gap-2">
            <span className="mt-2.5 shrink-0 text-xs font-medium text-bio-text-muted">{qIndex + 1}.</span>
            <div className="flex-1 space-y-2">
              <input
                type="text"
                placeholder="Question text"
                value={q.text}
                onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                className={inputClass}
              />
              <div className="flex gap-2">
                <select
                  value={q.type}
                  onChange={(e) => changeType(qIndex, e.target.value as QuizQuestionType)}
                  className={`${inputClass} max-w-[180px]`}
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={q.points}
                  onChange={(e) => updateQuestion(qIndex, { points: parseFloat(e.target.value) || 0 })}
                  placeholder="Points"
                  className={`${inputClass} max-w-[100px]`}
                />
              </div>

              {q.type === "multiple_choice" ? (
                <div className="space-y-1.5">
                  {(q.options ?? []).map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={q.correctAnswer === opt && opt !== ""}
                        onChange={() => updateQuestion(qIndex, { correctAnswer: opt })}
                        className="h-4 w-4 accent-bio-green"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                        placeholder={`Option ${optIndex + 1}`}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(qIndex, optIndex)}
                        className="shrink-0 text-bio-text-muted hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(qIndex)}
                    className="text-xs font-medium text-bio-green hover:text-bio-green/80"
                  >
                    + Add option
                  </button>
                  <p className="text-xs text-bio-text-muted">Select the radio button next to the correct option.</p>
                </div>
              ) : null}

              {q.type === "true_false" ? (
                <div className="flex gap-4">
                  {["true", "false"].map((v) => (
                    <label key={v} className="flex cursor-pointer items-center gap-1.5 text-sm text-bio-text">
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={q.correctAnswer === v}
                        onChange={() => updateQuestion(qIndex, { correctAnswer: v })}
                        className="h-4 w-4 accent-bio-green"
                      />
                      {v === "true" ? "True" : "False"}
                    </label>
                  ))}
                </div>
              ) : null}

              {q.type === "short_answer" ? (
                <p className="text-xs text-bio-text-muted italic">
                  Short-answer responses are graded manually after submission.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => removeQuestion(qIndex)}
              className="shrink-0 text-bio-text-muted hover:text-red-500"
              title="Remove question"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
