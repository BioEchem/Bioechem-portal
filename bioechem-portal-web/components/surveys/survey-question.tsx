"use client";

import type { SurveyQuestion } from "@/components/admin/survey-form";

type Props = {
  question: SurveyQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
};

export function SurveyQuestionInput({ question, value, onChange, readOnly = false }: Props) {
  const inputCls = "w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bio-green/40 disabled:opacity-70";

  if (question.type === "text") {
    return (
      <textarea
        className={inputCls}
        rows={3}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={readOnly}
        required={question.required}
      />
    );
  }

  if (question.type === "rating") {
    const current = typeof value === "number" ? value : 0;
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange(n)}
            className={`h-10 w-10 rounded-lg border text-sm font-medium transition-colors ${
              current === n
                ? "border-bio-green bg-bio-green text-white"
                : "border-card-border bg-card text-bio-text-muted hover:border-bio-green hover:text-bio-green"
            } disabled:pointer-events-none`}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "multiple_choice") {
    return (
      <div className="space-y-2">
        {question.options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name={question.id}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              disabled={readOnly}
              required={question.required}
              className="accent-bio-green"
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "checkbox") {
    const checked = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-2">
        {question.options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              value={opt}
              checked={checked.includes(opt)}
              disabled={readOnly}
              onChange={(e) => {
                if (readOnly) return;
                if (e.target.checked) {
                  onChange([...checked, opt]);
                } else {
                  onChange(checked.filter((v) => v !== opt));
                }
              }}
              className="accent-bio-green rounded"
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  return null;
}
