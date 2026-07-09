"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";
import { PortalCard } from "@/components/portal/portal-page";

type GradeDistribution = { a: number; b: number; c: number; d: number; f: number };

type CohortStat = {
  id: string;
  name: string;
  school: string | null;
  is_active: boolean;
  created_at: string;
  participants: number;
  teachers: number;
  pending_enrollments: number;
  total_assignments: number;
  graded_assignments: number;
  total_submissions: number;
  submission_rate: number | null;
  avg_grade: number | null;
  grade_distribution: GradeDistribution;
};

type Summary = {
  total_users: number;
  approved_users: number;
  pending_users: number;
  recent_signups_30d: number;
  users_by_role: Record<string, number>;
  total_cohorts: number;
  active_cohorts: number;
  total_submissions: number;
  total_grades: number;
};

type AnalyticsData = { summary: Summary; cohorts: CohortStat[] };

const ROLE_LABELS: Record<string, string> = {
  participant: "Participants",
  teacher: "Teachers",
  school_admin: "School admins",
  industry_partner: "Industry partners",
  shareholder: "Shareholders",
  bioechem_admin: "BioEChem admins",
};

function StatCard({ label, value, sub, icon: Icon }: {
  label: string;
  value: number | string;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-bio-text-muted">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-bio-text-muted" />}
      </div>
      <p className="mt-2 text-2xl font-bold text-bio-text">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-bio-text-muted">{sub}</p>}
    </div>
  );
}

function GradeBar({ dist }: { dist: GradeDistribution }) {
  const total = dist.a + dist.b + dist.c + dist.d + dist.f;
  if (total === 0) return <p className="text-xs text-bio-text-muted">No graded submissions</p>;

  const bars = [
    { label: "A (90–100%)", count: dist.a, color: "bg-bio-green" },
    { label: "B (80–89%)",  count: dist.b, color: "bg-blue-400" },
    { label: "C (70–79%)",  count: dist.c, color: "bg-amber-400" },
    { label: "D (60–69%)",  count: dist.d, color: "bg-orange-400" },
    { label: "F (<60%)",    count: dist.f, color: "bg-red-400" },
  ];

  return (
    <div className="space-y-1.5">
      {bars.map((bar) => (
        <div key={bar.label} className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs text-bio-text-muted">{bar.label}</span>
          <div className="flex-1 rounded-full bg-bio-bg h-2">
            <div
              className={`h-2 rounded-full ${bar.color}`}
              style={{ width: `${Math.round((bar.count / total) * 100)}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs text-bio-text-muted">{bar.count}</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/analytics");
        const json = await res.json() as AnalyticsData & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Failed to load");
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-bio-text-muted" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-red-600">{error ?? "Failed to load."}</p>;
  }

  const { summary, cohorts } = data;

  const filteredCohorts = cohorts.filter((c) =>
    filter === "all" ? true : filter === "active" ? c.is_active : !c.is_active
  );

  return (
    <div className="space-y-6">
      {/* Platform summary */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-bio-text-muted">Platform overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={summary.total_users} sub={`${summary.pending_users} pending approval`} icon={Users} />
          <StatCard label="Approved users" value={summary.approved_users} sub={`+${summary.recent_signups_30d} last 30 days`} icon={TrendingUp} />
          <StatCard label="Cohorts" value={summary.total_cohorts} sub={`${summary.active_cohorts} active`} icon={GraduationCap} />
          <StatCard label="Total submissions" value={summary.total_submissions} sub={`${summary.total_grades} graded`} icon={CheckCircle} />
        </div>
      </div>

      {/* Users by role */}
      <PortalCard>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">Users by role</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(summary.users_by_role)
            .sort(([, a], [, b]) => b - a)
            .map(([role, count]) => (
              <div key={role} className="flex items-center justify-between rounded-lg border border-card-border px-3 py-2">
                <span className="text-sm text-bio-text">{ROLE_LABELS[role] ?? role}</span>
                <span className="text-sm font-semibold text-bio-green">{count}</span>
              </div>
            ))}
        </div>
      </PortalCard>

      {/* Per-cohort breakdown */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-bio-text-muted">Cohort breakdown</h2>
          <div className="flex gap-1 rounded-lg border border-card-border p-0.5 text-xs">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded px-2.5 py-1 capitalize transition-colors ${filter === f ? "bg-bio-green text-white" : "text-bio-text-muted hover:text-bio-text"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredCohorts.length === 0 ? (
          <PortalCard><p className="text-sm text-bio-text-muted">No cohorts match this filter.</p></PortalCard>
        ) : (
          <div className="space-y-2">
            {filteredCohorts.map((cohort) => {
              const isExpanded = expandedId === cohort.id;
              return (
                <PortalCard key={cohort.id}>
                  {/* Summary row */}
                  <div
                    className="flex cursor-pointer items-center justify-between gap-4"
                    onClick={() => setExpandedId(isExpanded ? null : cohort.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-bio-text">{cohort.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cohort.is_active ? "bg-bio-green/10 text-bio-green" : "bg-gray-100 text-gray-500"}`}>
                          {cohort.is_active ? "Active" : "Inactive"}
                        </span>
                        {cohort.school && <span className="text-xs text-bio-text-muted">{cohort.school}</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-4 text-xs text-bio-text-muted">
                        <span><strong className="text-bio-text">{cohort.participants}</strong> participants</span>
                        <span><strong className="text-bio-text">{cohort.teachers}</strong> teachers</span>
                        <span><strong className="text-bio-text">{cohort.total_assignments}</strong> assignments</span>
                        <span><strong className="text-bio-text">{cohort.total_submissions}</strong> submissions</span>
                        {cohort.submission_rate != null && (
                          <span><strong className="text-bio-text">{cohort.submission_rate}%</strong> submission rate</span>
                        )}
                        {cohort.avg_grade != null && (
                          <span><strong className="text-bio-text">{cohort.avg_grade} pts</strong> avg grade</span>
                        )}
                      </div>
                    </div>
                    <button className="shrink-0 text-bio-text-muted hover:text-bio-green">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-card-border pt-4 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-bio-text-muted">Enrollment</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-bio-text-muted">Participants</span><span className="font-medium">{cohort.participants}</span></div>
                            <div className="flex justify-between"><span className="text-bio-text-muted">Teachers</span><span className="font-medium">{cohort.teachers}</span></div>
                            <div className="flex justify-between"><span className="text-bio-text-muted">Pending</span><span className="font-medium">{cohort.pending_enrollments}</span></div>
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-bio-text-muted">Assignments</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-bio-text-muted">Total</span><span className="font-medium">{cohort.total_assignments}</span></div>
                            <div className="flex justify-between"><span className="text-bio-text-muted">Graded</span><span className="font-medium">{cohort.graded_assignments}</span></div>
                            <div className="flex justify-between"><span className="text-bio-text-muted">Submissions</span><span className="font-medium">{cohort.total_submissions}</span></div>
                            {cohort.submission_rate != null && (
                              <div className="flex justify-between"><span className="text-bio-text-muted">Submission rate</span><span className="font-medium text-bio-green">{cohort.submission_rate}%</span></div>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-bio-text-muted">Grades</p>
                          {cohort.avg_grade != null ? (
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between"><span className="text-bio-text-muted">Average</span><span className="font-medium text-bio-green">{cohort.avg_grade} pts</span></div>
                            </div>
                          ) : (
                            <p className="text-xs text-bio-text-muted">No grades yet</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-bio-text-muted">Grade distribution</p>
                        <GradeBar dist={cohort.grade_distribution} />
                      </div>
                    </div>
                  )}
                </PortalCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
