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
    max_points: number;
    module_items: { title: string; module_id: string } | null;
  } | null;
};

function pct(earned: number | null, max: number) {
  if (earned == null) return null;
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
    .select("id, points_earned, feedback, graded_at, assignments(id, max_points, module_items(title, module_id))")
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .order("graded_at", { ascending: false })
    .returns<GradeRow[]>();

  const rows = grades ?? [];
  const totalEarned = rows.reduce((sum, g) => sum + (g.points_earned ?? 0), 0);
  const totalMax = rows.reduce((sum, g) => sum + (g.assignments?.max_points ?? 0), 0);
  const overallPct = totalMax > 0 ? pct(totalEarned, totalMax) : null;

  return (
    <PortalPage title="Grades" description={cohort.name}>
      <div className="space-y-4">
        <Link
          href={`/cohorts/${cohortId}`}
          className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ChevronLeft className="h-4 w-4" /> Back to cohort
        </Link>

        {/* Summary */}
        <PortalCard>
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-xs text-bio-text-muted uppercase tracking-wide">Total earned</p>
              <p className="mt-1 text-3xl font-bold text-bio-green">
                {totalEarned} <span className="text-lg text-bio-text-muted">/ {totalMax}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-bio-text-muted uppercase tracking-wide">Overall</p>
              <p className="mt-1 text-3xl font-bold text-bio-green">
                {overallPct != null ? `${overallPct}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-bio-text-muted uppercase tracking-wide">Letter grade</p>
              <p className="mt-1 text-3xl font-bold text-bio-green">{letterGrade(overallPct)}</p>
            </div>
          </div>
        </PortalCard>

        {/* Grades table */}
        <PortalCard>
          {rows.length === 0 ? (
            <p className="text-sm text-bio-text-muted">No graded assignments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border text-left text-xs text-bio-text-muted">
                    <th className="pb-2 pr-4 font-medium">Assignment</th>
                    <th className="pb-2 pr-4 font-medium">Score</th>
                    <th className="pb-2 pr-4 font-medium">%</th>
                    <th className="pb-2 pr-4 font-medium">Grade</th>
                    <th className="pb-2 font-medium">Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {rows.map((grade) => {
                    const p = pct(grade.points_earned, grade.assignments?.max_points ?? 100);
                    const item = grade.assignments?.module_items;
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
                        <td className="py-3 pr-4 text-bio-text">
                          {grade.points_earned ?? "—"} / {grade.assignments?.max_points ?? "—"}
                        </td>
                        <td className="py-3 pr-4 text-bio-text-muted">
                          {p != null ? `${p}%` : "—"}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`font-semibold ${
                            p == null ? "text-bio-text-muted"
                            : p >= 90 ? "text-bio-green"
                            : p >= 70 ? "text-amber-600"
                            : "text-red-500"
                          }`}>
                            {letterGrade(p)}
                          </span>
                        </td>
                        <td className="py-3 text-bio-text-muted">
                          {grade.feedback ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PortalCard>
      </div>
    </PortalPage>
  );
}
