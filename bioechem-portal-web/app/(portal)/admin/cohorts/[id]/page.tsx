import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Calendar, Users, BookOpen, ClipboardList, Settings } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { EnrollmentReviewTable, type ReviewableEnrollment, type ReviewerNames } from "@/components/cohorts/enrollment-review-table";
import { CertificateUploader } from "@/components/certificates/certificate-uploader";
import { CohortsurveysPanel } from "@/components/admin/cohort-surveys-panel";
import { ArchiveCohortButton } from "@/components/admin/archive-cohort-button";
import { requireSession } from "@/lib/auth/session";
import { formatShortDate as fmt } from "@/lib/format/date";
import { formatShortDateTime as fmtDateTime } from "@/lib/format/date";

export const metadata: Metadata = { title: "Cohort overview" };

type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  published: boolean;
  item_count?: number;
};

type GradeRow = {
  user_id: string;
  points_earned: number | null;
  assignments: { max_points: number } | null;
};

export default async function AdminCohortOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const { id } = await params;
  const { back } = await searchParams;
  const backHref = back?.startsWith("/admin/") ? back : null;

  const { supabase, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "approval_status, role, school_id",
  });

  const isBioAdmin = profile.role === "bioechem_admin";
  const isSchoolAdmin = profile.role === "school_admin";
  if (!isBioAdmin && !isSchoolAdmin) notFound();

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, name, description, school_id, status, is_active, start_date, end_date, max_enrollment, enrollment_requires_approval, created_at, schools(name)")
    .eq("id", id)
    .single();

  if (!cohort) notFound();

  if (isSchoolAdmin && !isBioAdmin) {
    const adminProfile = profile as typeof profile & { school_id: string | null };
    if ((cohort as Record<string, unknown>).school_id !== adminProfile.school_id) notFound();
  }

  // Parallel data fetch
  const [enrollmentsRes, modulesRes, gradesRes, assignmentsRes] = await Promise.all([
    supabase
      .from("cohort_enrollments")
      .select("id, user_id, role, status, enrolled_at, reviewed_at, reviewed_by, profiles!user_id(full_name, email)")
      .eq("cohort_id", id)
      .order("enrolled_at", { ascending: false })
      .returns<ReviewableEnrollment[]>(),
    supabase
      .from("modules")
      .select("id, title, description, position, published")
      .eq("cohort_id", id)
      .order("position")
      .returns<ModuleRow[]>(),
    supabase
      .from("grades")
      .select("user_id, points_earned, assignments(max_points)")
      .eq("cohort_id", id)
      .returns<GradeRow[]>(),
    supabase
      .from("assignments")
      .select("id, due_at, max_points, module_items(title)")
      .eq("cohort_id", id)
      .order("due_at", { ascending: true }),
  ]);

  const allEnrollments = enrollmentsRes.data ?? [];
  const teacherEnrollments = allEnrollments.filter((e) => e.role === "teacher");
  const participantEnrollments = allEnrollments.filter((e) => e.role === "participant");
  const approvedParticipants = participantEnrollments.filter((e) => e.status === "approved");
  const pendingEnrollments = allEnrollments.filter((e) => e.status === "pending");
  const rejectedEnrollments = allEnrollments.filter((e) => e.status === "rejected");

  const modules = modulesRes.data ?? [];
  const grades = gradesRes.data ?? [];
  type AssignmentRow = { id: string; due_at: string | null; max_points: number; module_items: { title: string } | null };
  const assignments = (assignmentsRes.data ?? []).map((a) => ({
    ...a,
    module_items: Array.isArray(a.module_items) ? (a.module_items[0] ?? null) : a.module_items,
  })) as AssignmentRow[];

  // Reviewer names
  const reviewerIds = [...new Set(allEnrollments.map((e) => e.reviewed_by).filter((x): x is string => !!x))];
  const reviewerNames: ReviewerNames = {};
  if (reviewerIds.length > 0) {
    const { data: rp } = await supabase.from("profiles").select("id, full_name, email").in("id", reviewerIds);
    for (const p of rp ?? []) reviewerNames[p.id] = p.full_name ?? p.email ?? "Admin";
  }

  // Per-student grade summary
  type StudentGrade = { earned: number; max: number };
  const studentGrades = new Map<string, StudentGrade>();
  for (const g of grades) {
    const existing = studentGrades.get(g.user_id) ?? { earned: 0, max: 0 };
    studentGrades.set(g.user_id, {
      earned: existing.earned + (g.points_earned ?? 0),
      max: existing.max + (g.assignments?.max_points ?? 0),
    });
  }

  // Surveys for this cohort
  type SurveyRow = { id: string; title: string; type: string; status: string; created_at: string };
  const { data: surveysData } = await supabase
    .from("surveys")
    .select("id, title, type, status, created_at")
    .eq("cohort_id", id)
    .order("created_at", { ascending: false })
    .returns<SurveyRow[]>();
  const cohortSurveys = surveysData ?? [];

  // Certificates
  type CertRow = {
    id: string;
    title: string;
    file_url: string;
    filename: string | null;
    uploaded_at: string;
    user_id: string;
    profiles: { full_name: string | null; email: string | null } | null;
  };
  const { data: certsData } = await supabase
    .from("certificates")
    .select("id, title, file_url, filename, uploaded_at, user_id, profiles!user_id(full_name, email)")
    .eq("cohort_id", id)
    .order("uploaded_at", { ascending: false })
    .returns<CertRow[]>();
  const certs = certsData ?? [];

  // Upcoming due dates (next 7 days or soonest)
  const now = new Date();
  const upcomingAssignments = assignments
    .filter((a) => a.due_at && new Date(a.due_at) >= now)
    .slice(0, 5);

  const c = cohort as Record<string, unknown>;
  const cohortName = c.name as string;
  const cohortDesc = c.description as string | null;
  const startDate = c.start_date as string | null;
  const endDate = c.end_date as string | null;
  const maxEnrollment = c.max_enrollment as number | null;
  const requiresApproval = c.enrollment_requires_approval as boolean;
  const status = c.status as string;
  const schoolId = c.school_id as string | null;
  const schoolName = (c.schools as { name: string } | null)?.name
    ?? ((c.schools as { name: string }[] | null)?.[0]?.name)
    ?? null;

  const totalPoints = assignments.reduce((s, a) => s + a.max_points, 0);

  return (
    <PortalPage title={cohortName} description={schoolName ?? "Standalone cohort"}>
      <div className="space-y-5">
        {/* Back + actions bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href={backHref ?? (schoolId ? `/admin/schools/${schoolId}` : "/admin/cohorts")}
            className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
          >
            <ChevronLeft className="h-4 w-4" />
            {backHref
              ? backHref.endsWith("/cohorts") ? `${schoolName ?? "School"} · Cohorts` : (schoolName ?? "Back")
              : schoolId && schoolName ? schoolName : "All cohorts"}
          </Link>
          <div className="flex items-center gap-2">
            {status !== "archived" && isBioAdmin && (
              <ArchiveCohortButton cohortId={id} cohortName={cohortName} />
            )}
            <Link
              href={`/admin/cohorts/${id}/edit`}
              className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium text-bio-text hover:border-bio-green hover:text-bio-green"
            >
              <Settings className="h-4 w-4" /> Manage settings
            </Link>
          </div>
        </div>

        {/* Cohort info + stats */}
        <PortalCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-bio-text">{cohortName}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                  status === "active" ? "bg-bio-green/10 text-bio-green"
                  : status === "draft" ? "bg-amber-100 text-amber-700"
                  : "bg-bio-text-muted/10 text-bio-text-muted"
                }`}>
                  {status}
                </span>
              </div>
              {cohortDesc ? <p className="mt-1 text-sm text-bio-text-muted">{cohortDesc}</p> : null}
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-bio-text-muted">
                {startDate ? (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {fmt(startDate)} {endDate ? `→ ${fmt(endDate)}` : ""}
                  </span>
                ) : null}
                {maxEnrollment ? (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {approvedParticipants.length} / {maxEnrollment} students
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {approvedParticipants.length} students enrolled
                  </span>
                )}
                <span>{requiresApproval ? "Approval required" : "Open enrollment"}</span>
              </div>
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Teachers", value: teacherEnrollments.filter((e) => e.status === "approved").length, color: "text-bio-green" },
                { label: "Students", value: approvedParticipants.length, color: "text-bio-green" },
                { label: "Pending", value: pendingEnrollments.length, color: pendingEnrollments.length > 0 ? "text-amber-600" : "text-bio-text-muted" },
                { label: "Rejected", value: rejectedEnrollments.length, color: "text-bio-text-muted" },
                { label: "Modules", value: modules.length, color: "text-bio-green" },
                { label: "Assignments", value: assignments.length, color: "text-bio-green" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-card-border px-4 py-2 text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-bio-text-muted">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </PortalCard>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Course content */}
          <PortalCard>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">Course content</h2>
              <Link
                href={`/cohorts/${id}?tab=modules&back=/admin/cohorts/${id}`}
                className="rounded-lg border border-bio-green/30 bg-bio-green/8 px-3 py-1.5 text-sm font-medium text-bio-green hover:bg-bio-green/15"
              >
                View content →
              </Link>
            </div>
            {modules.length === 0 ? (
              <p className="text-sm text-bio-text-muted">No modules created yet.</p>
            ) : (
              <div className="space-y-2">
                {modules.map((mod) => (
                  <Link
                    key={mod.id}
                    href={`/cohorts/${id}?tab=modules&moduleId=${mod.id}&back=${encodeURIComponent(`/admin/cohorts/${id}`)}`}
                    className="flex items-center gap-3 rounded-lg border border-card-border p-3 hover:border-bio-green/40"
                  >
                    <BookOpen className="h-4 w-4 shrink-0 text-bio-green/60" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-bio-text truncate">{mod.title}</p>
                      {mod.description ? (
                        <p className="text-xs text-bio-text-muted truncate">{mod.description}</p>
                      ) : null}
                    </div>
                    {!mod.published ? (
                      <span className="shrink-0 text-xs text-bio-text-muted">Draft</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </PortalCard>

          {/* Timeline / upcoming due dates */}
          <PortalCard>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">Timeline</h2>
            <div className="space-y-3">
              {startDate ? (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bio-green text-white">
                    <Calendar className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-bio-text">Course starts</p>
                    <p className="text-xs text-bio-text-muted">{fmt(startDate)}</p>
                  </div>
                </div>
              ) : null}

              {upcomingAssignments.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-bio-text-muted">
                    Upcoming due dates
                  </p>
                  <div className="space-y-2">
                    {upcomingAssignments.map((a) => (
                      <div key={a.id} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100">
                          <ClipboardList className="h-3 w-3 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm text-bio-text">
                            {(a.module_items as { title: string } | null)?.title ?? "Assignment"}
                          </p>
                          <p className="text-xs text-bio-text-muted">
                            Due {fmtDateTime(a.due_at!)} · {a.max_points} pts
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : assignments.length > 0 ? (
                <p className="text-sm text-bio-text-muted">No upcoming due dates.</p>
              ) : null}

              {endDate ? (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bio-text-muted/20">
                    <Calendar className="h-3 w-3 text-bio-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-bio-text">Course ends</p>
                    <p className="text-xs text-bio-text-muted">{fmt(endDate)}</p>
                  </div>
                </div>
              ) : null}

              {!startDate && !endDate && assignments.length === 0 ? (
                <p className="text-sm text-bio-text-muted">No timeline set.</p>
              ) : null}

              <div className="border-t border-card-border pt-3">
                <p className="text-xs text-bio-text-muted">
                  Total course weight: <span className="font-medium text-bio-text">{totalPoints} pts</span>
                </p>
              </div>
            </div>
          </PortalCard>
        </div>

        {/* Student progress / grade summary */}
        {approvedParticipants.length > 0 ? (
          <PortalCard>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">Student Progress</h2>
            <div className="divide-y divide-card-border">
              {approvedParticipants.map((e) => {
                const g = studentGrades.get(e.user_id) ?? { earned: 0, max: 0 };
                const pct = g.max > 0 ? Math.round((g.earned / g.max) * 100) : null;
                const submittedCount = grades.filter((gr) => gr.user_id === e.user_id).length;
                return (
                  <div key={e.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-bio-text">
                        {e.profiles?.full_name ?? e.profiles?.email ?? "Unknown"}
                      </p>
                      <p className="text-xs text-bio-text-muted">{e.profiles?.email}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-bio-text-muted text-xs">
                        {submittedCount} / {assignments.length} submitted
                      </span>
                      {g.max > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-bio-mint/40">
                            <div
                              className={`h-full rounded-full ${(pct ?? 0) >= 70 ? "bg-bio-green" : "bg-amber-400"}`}
                              style={{ width: `${pct ?? 0}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${(pct ?? 0) >= 70 ? "text-bio-green" : "text-amber-600"}`}>
                            {g.earned} / {g.max} pts ({pct}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-bio-text-muted">No grades yet</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </PortalCard>
        ) : null}

        {/* Surveys */}
        <PortalCard>
          <CohortsurveysPanel cohortId={id} cohortName={cohortName} surveys={cohortSurveys} />
        </PortalCard>

        {/* Certificates */}
        <PortalCard>
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-bio-green">Certificates</h2>
          <CertificateUploader
            cohortId={id}
            students={approvedParticipants.map((e) => ({
              user_id: e.user_id,
              name: e.profiles?.full_name ?? null,
              email: e.profiles?.email ?? null,
            }))}
            initialCerts={certs}
          />
        </PortalCard>

        {/* Enrollments */}
        <PortalCard>
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-bio-green">Enrollments</h2>
          <div className="space-y-8">
            <EnrollmentReviewTable
              title="Teachers"
              rows={teacherEnrollments}
              reviewerNames={reviewerNames}
              canManage={true}
            />
            <div className="border-t border-card-border pt-6">
              <EnrollmentReviewTable
                title="Students / Participants"
                rows={participantEnrollments}
                reviewerNames={reviewerNames}
                canManage={true}
                maxEnrollment={maxEnrollment}
              />
            </div>
          </div>
        </PortalCard>
      </div>
    </PortalPage>
  );
}
