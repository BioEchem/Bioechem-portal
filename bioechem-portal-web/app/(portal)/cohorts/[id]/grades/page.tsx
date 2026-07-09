import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Grades" };

type GradeRow = {
  id: string;
  points_earned: number | null;
  feedback: string | null;
  graded_at: string;
  assignments: {
    id: string;
    max_points: number | null;
    requires_grading: boolean;
    grade_category: string;
    assignment_type: string;
    module_items: { title: string; module_id: string } | null;
  } | null;
};

const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  assignment: "Assignment",
  presentation: "Presentation",
  field_trip: "Field Trip",
  quiz: "Quiz",
  other: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  assignment: "bg-blue-50 text-blue-700",
  presentation: "bg-purple-50 text-purple-700",
  field_trip: "bg-amber-50 text-amber-700",
  quiz: "bg-teal-50 text-teal-700",
  other: "bg-gray-100 text-gray-600",
};

function pct(earned: number | null, max: number | null) {
  if (earned == null || max == null || max === 0) return null;
  return Math.round((earned / max) * 100);
}

function letterGrade(p: number | null) {
  if (p == null) return "—";
  if (p >= 90) return "A";
  if (p >= 80) return "B";
  if (p >= 70) return "C";
  if (p >= 60) return "D";
  return "F";
}

function gradeColor(p: number | null) {
  if (p == null) return "text-bio-text-muted";
  if (p >= 90) return "text-bio-green";
  if (p >= 70) return "text-amber-600";
  return "text-red-500";
}

function GradeTable({ rows, cohortId, showLetter = true }: {
  rows: GradeRow[];
  cohortId: string;
  showLetter?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-bio-text-muted">No grades yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-card-border text-left text-xs text-bio-text-muted">
            <th className="pb-2 pr-4 font-medium">Activity</th>
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 font-medium">Score</th>
            {showLetter && <th className="pb-2 pr-4 font-medium">Grade</th>}
            <th className="pb-2 font-medium">Feedback</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {rows.map((grade) => {
            const a = grade.assignments;
            const item = a?.module_items;
            const p = pct(grade.points_earned, a?.max_points ?? null);
            const typeLabel = ASSIGNMENT_TYPE_LABELS[a?.assignment_type ?? ""] ?? "—";
            const typeColor = TYPE_COLORS[a?.assignment_type ?? ""] ?? "bg-gray-100 text-gray-600";
            return (
              <tr key={grade.id}>
                <td className="py-3 pr-4 font-medium text-bio-text">
                  {item ? (
                    <Link
                      href={`/cohorts/${cohortId}/modules/${item.module_id}`}
                      className="hover:text-bio-green hover:underline"
                    >
                      {item.title}
                    </Link>
                  ) : "—"}
                </td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColor}`}>
                    {typeLabel}
                  </span>
                </td>
                <td className="py-3 pr-4 text-bio-text">
                  {a?.requires_grading === false ? (
                    <span className="text-bio-text-muted text-xs">No grading</span>
                  ) : (
                    <span>
                      {grade.points_earned ?? "—"}
                      {a?.max_points != null ? ` / ${a.max_points}` : ""}
                      {p != null ? <span className="ml-1 text-bio-text-muted">({p}%)</span> : null}
                    </span>
                  )}
                </td>
                {showLetter && (
                  <td className="py-3 pr-4">
                    <span className={`text-base font-bold ${gradeColor(p)}`}>
                      {a?.requires_grading === false ? "—" : letterGrade(p)}
                    </span>
                  </td>
                )}
                <td className="py-3 text-bio-text-muted text-xs max-w-xs truncate">
                  {grade.feedback ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function GradesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: cohortId } = await params;

  const { supabase, user, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "approval_status, role",
  });

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, name")
    .eq("id", cohortId)
    .single();

  if (!cohort) notFound();

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

  const { data: grades } = await supabase
    .from("grades")
    .select("id, points_earned, feedback, graded_at, assignments(id, max_points, requires_grading, grade_category, assignment_type, module_items(title, module_id))")
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .order("graded_at", { ascending: false })
    .returns<GradeRow[]>();

  const rows = grades ?? [];

  const intermediateRows = rows.filter((g) => (g.assignments?.grade_category ?? "intermediate") === "intermediate");
  const finalRows = rows.filter((g) => g.assignments?.grade_category === "final");

  // Subtotals for graded-only rows
  const gradedIntermediate = intermediateRows.filter((g) => g.assignments?.requires_grading !== false && g.assignments?.max_points);
  const intEarned = gradedIntermediate.reduce((s, g) => s + (g.points_earned ?? 0), 0);
  const intMax = gradedIntermediate.reduce((s, g) => s + (g.assignments?.max_points ?? 0), 0);
  const intPct = pct(intEarned, intMax);

  const gradedFinal = finalRows.filter((g) => g.assignments?.requires_grading !== false && g.assignments?.max_points);
  const finEarned = gradedFinal.reduce((s, g) => s + (g.points_earned ?? 0), 0);
  const finMax = gradedFinal.reduce((s, g) => s + (g.assignments?.max_points ?? 0), 0);
  const finPct = pct(finEarned, finMax);

  const totalEarned = intEarned + finEarned;
  const totalMax = intMax + finMax;
  const overallPct = pct(totalEarned, totalMax);

  return (
    <PortalPage title="Grades" description={cohort.name}>
      <div className="space-y-4">
        <Link
          href={`/cohorts/${cohortId}`}
          className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ChevronLeft className="h-4 w-4" /> Back to cohort
        </Link>

        {/* Overall summary */}
        <PortalCard>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-bio-text-muted">Overall summary</h3>
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-xs text-bio-text-muted uppercase tracking-wide">Total earned</p>
              <p className="mt-1 text-3xl font-bold text-bio-green">
                {totalEarned} <span className="text-lg text-bio-text-muted">/ {totalMax}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-bio-text-muted uppercase tracking-wide">Overall %</p>
              <p className="mt-1 text-3xl font-bold text-bio-green">
                {overallPct != null ? `${overallPct}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-bio-text-muted uppercase tracking-wide">Letter grade</p>
              <p className={`mt-1 text-3xl font-bold ${gradeColor(overallPct)}`}>{letterGrade(overallPct)}</p>
            </div>
            {intPct != null && finPct != null && (
              <div className="ml-auto flex gap-6 text-right">
                <div>
                  <p className="text-xs text-bio-text-muted uppercase tracking-wide">Intermediate</p>
                  <p className="mt-1 text-xl font-semibold text-bio-text">{intPct}%</p>
                </div>
                <div>
                  <p className="text-xs text-bio-text-muted uppercase tracking-wide">Final</p>
                  <p className="mt-1 text-xl font-semibold text-bio-text">{finPct}%</p>
                </div>
              </div>
            )}
          </div>
        </PortalCard>

        {/* Intermediate / Periodical grades */}
        <PortalCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-bio-text">Intermediate / Periodical grades</h3>
              <p className="text-xs text-bio-text-muted">Presentations, field trips, assignments, quizzes</p>
            </div>
            {intMax > 0 && (
              <div className="text-right">
                <p className="text-lg font-bold text-bio-green">{intEarned} / {intMax}</p>
                <p className="text-xs text-bio-text-muted">{intPct}% · {letterGrade(intPct)}</p>
              </div>
            )}
          </div>
          <GradeTable rows={intermediateRows} cohortId={cohortId} />
        </PortalCard>

        {/* Final grade */}
        <PortalCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-bio-text">Final grade</h3>
              <p className="text-xs text-bio-text-muted">End-of-cohort overall assessment</p>
            </div>
            {finMax > 0 && (
              <div className="text-right">
                <p className="text-lg font-bold text-bio-green">{finEarned} / {finMax}</p>
                <p className="text-xs text-bio-text-muted">{finPct}% · {letterGrade(finPct)}</p>
              </div>
            )}
          </div>
          {finalRows.length === 0 ? (
            <p className="text-sm text-bio-text-muted">No final grade assigned yet.</p>
          ) : (
            <GradeTable rows={finalRows} cohortId={cohortId} />
          )}
        </PortalCard>
      </div>
    </PortalPage>
  );
}
