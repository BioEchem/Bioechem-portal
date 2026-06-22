import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { CohortTabs } from "@/components/cohorts/cohort-tabs";
import { AnnouncementsSection } from "@/components/cohorts/announcements-section";
import { ModuleList } from "@/components/cohorts/module-list";
import { EnrollButton } from "@/components/cohorts/enroll-button";
import { EnrollmentReviewTable, type ReviewableEnrollment, type ReviewerNames } from "@/components/cohorts/enrollment-review-table";
import { RosterPeopleTable, type RosterEntry } from "@/components/cohorts/roster-people-table";
import { requireSession } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Cohort" };

type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  published: boolean;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

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


function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function pct(earned: number | null, max: number) {
  if (earned == null || max === 0) return null;
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

export default async function CohortHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; back?: string }>;
}) {
  const { id: cohortId } = await params;
  const { tab = "home", back } = await searchParams;
  const backHref = back?.startsWith("/admin/") ? back : null;

  const { supabase, user, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "approval_status, role, school_id",
  });

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, name, description, start_date, end_date, max_enrollment, enrollment_requires_approval, status, schools(name)")
    .eq("id", cohortId)
    .single();

  if (!cohort) notFound();

  const { data: enrollment } = await supabase
    .from("cohort_enrollments")
    .select("role, status")
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .maybeSingle();

  const isBioAdmin = profile.role === "bioechem_admin";
  const isSchoolAdmin = profile.role === "school_admin";
  const isTeacher = enrollment?.role === "teacher" && enrollment?.status === "approved";
  const isAdmin = isBioAdmin || isSchoolAdmin;
  const canManage = isAdmin || isTeacher;
  const isApprovedEnrolled = enrollment?.status === "approved";
  const canViewContent = canManage || isApprovedEnrolled;

  let pendingCount = 0;
  if (canManage) {
    const { count } = await supabase
      .from("cohort_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("cohort_id", cohortId)
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  // Fetch home/modules content
  let announcements: AnnouncementRow[] = [];
  let modules: ModuleRow[] = [];
  if ((tab === "home" || tab === "modules") && canViewContent) {
    const [annRes, modRes] = await Promise.all([
      supabase
        .from("announcements")
        .select("id, title, body, is_pinned, created_at, profiles(full_name)")
        .eq("cohort_id", cohortId)
        .eq("published", true)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<AnnouncementRow[]>(),
      supabase
        .from("modules")
        .select("id, title, description, position, published")
        .eq("cohort_id", cohortId)
        .order("position")
        .returns<ModuleRow[]>(),
    ]);
    announcements = annRes.data ?? [];
    let mods = modRes.data ?? [];
    if (!canManage) mods = mods.filter((m) => m.published);
    modules = mods;
  }

  // Fetch grades data when on grades tab (current user's own grades)
  let myGrades: GradeRow[] = [];
  if (tab === "grades" && canViewContent) {
    const { data } = await supabase
      .from("grades")
      .select("id, points_earned, feedback, graded_at, assignments(id, max_points, module_items(title, module_id))")
      .eq("cohort_id", cohortId)
      .eq("user_id", user.id)
      .order("graded_at", { ascending: false })
      .returns<GradeRow[]>();
    myGrades = data ?? [];
  }

  // Fetch roster data when on roster tab
  let rosterEnrollments: (ReviewableEnrollment & { profiles: { full_name: string | null; email: string | null } | null })[] = [];
  let reviewerNames: ReviewerNames = {};
  let peopleList: RosterEntry[] = [];

  if (tab === "roster" && canViewContent) {
    // All enrolled users see the people list — use admin client to bypass RLS
    const adminClient = createServiceRoleClient();
    if (adminClient) {
      type PeopleRow = { id: string; user_id: string; role: string; profiles: { full_name: string | null; email: string | null } | null };
      const { data: peopleRows } = await adminClient
        .from("cohort_enrollments")
        .select("id, user_id, role, profiles!user_id(full_name, email)")
        .eq("cohort_id", cohortId)
        .eq("status", "approved")
        .order("enrolled_at")
        .returns<PeopleRow[]>();
      peopleList = (peopleRows ?? []).map((e) => ({
        id: e.id,
        userId: e.user_id,
        name: e.profiles?.full_name ?? null,
        email: e.profiles?.email ?? null,
        cohortRole: e.role as "teacher" | "participant",
      }));
    }

    // Managers also get the full enrollment list for pending approval workflow
    if (canManage) {
      const { data: enrollData } = await supabase
        .from("cohort_enrollments")
        .select("id, user_id, role, status, enrolled_at, reviewed_at, reviewed_by, profiles!user_id(full_name, email)")
        .eq("cohort_id", cohortId)
        .order("enrolled_at")
        .returns<ReviewableEnrollment & { profiles: { full_name: string | null; email: string | null } | null }>();
      rosterEnrollments = (enrollData ?? []) as typeof rosterEnrollments;

      const reviewerIds = [...new Set(rosterEnrollments.map((e) => e.reviewed_by).filter((id): id is string => !!id))];
      if (reviewerIds.length > 0) {
        const { data: rp } = await supabase.from("profiles").select("id, full_name, email").in("id", reviewerIds);
        for (const p of rp ?? []) reviewerNames[p.id] = p.full_name ?? p.email ?? "Admin";
      }
    }
  }

  type CohortData = {
    id: string; name: string; description: string | null;
    start_date: string | null; end_date: string | null;
    max_enrollment: number | null; enrollment_requires_approval: boolean;
    status: string; schools: { name: string } | null;
  };
  const raw = cohort as unknown as CohortData & { schools: { name: string }[] | { name: string } | null };
  const cohortData: CohortData = {
    ...raw,
    schools: Array.isArray(raw.schools) ? (raw.schools[0] ?? null) : raw.schools,
  };

  const tabs = [
    { key: "home", label: "Home" },
    ...(canViewContent ? [{ key: "modules", label: "Modules" }] : []),
    ...(canViewContent ? [{ key: "grades", label: "Grades" }] : []),
    ...(canViewContent ? [{ key: "roster", label: "Roster", badge: canManage ? pendingCount : 0 }] : []),
  ];

  // ── Grades tab computed values ──
  const gradesTotal = myGrades.reduce((s, g) => s + (g.assignments?.max_points ?? 0), 0);
  const gradesEarned = myGrades.reduce((s, g) => s + (g.points_earned ?? 0), 0);
  const overallPct = gradesTotal > 0 ? pct(gradesEarned, gradesTotal) : null;

  // ── Roster tab computed values ──
  const teacherEnrollments = rosterEnrollments.filter((e) => e.role === "teacher");
  const participantEnrollments = rosterEnrollments.filter((e) => e.role === "participant");
  const canManageTeachers = isBioAdmin || isSchoolAdmin;
  const rosterPendingCount = rosterEnrollments.filter((e) => e.status === "pending").length;

  return (
    <PortalPage title={cohortData.name} description={cohortData.schools?.name ?? "Standalone cohort"}>
      {(backHref ?? (!isAdmin ? "/cohorts" : null)) ? (
        <Link
          href={backHref ?? "/cohorts"}
          className="mb-2 inline-flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ChevronLeft className="h-4 w-4" />
          {backHref ? "Back to cohort overview" : "Back to courses"}
        </Link>
      ) : null}
      <div className="space-y-4">
        {/* Cohort meta bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-card-border bg-card p-4">
          <div className="flex flex-wrap gap-4 text-sm text-bio-text-muted">
            {cohortData.start_date ? (
              <span>
                <span className="font-medium text-bio-text">Start:</span>{" "}
                {fmt(cohortData.start_date)}
              </span>
            ) : null}
            {cohortData.end_date ? (
              <span>
                <span className="font-medium text-bio-text">End:</span>{" "}
                {fmt(cohortData.end_date)}
              </span>
            ) : null}
            {cohortData.max_enrollment ? (
              <span>
                <span className="font-medium text-bio-text">Capacity:</span>{" "}
                {cohortData.max_enrollment}
              </span>
            ) : null}
          </div>

          {isAdmin || isTeacher ? (
            <Link
              href={`/cohorts/${cohortId}?tab=roster${backHref ? `&back=${encodeURIComponent(backHref)}` : ""}`}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                pendingCount > 0
                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "border border-card-border text-bio-text-muted hover:text-bio-text"
              }`}
            >
              {pendingCount > 0 ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">
                  {pendingCount}
                </span>
              ) : null}
              {pendingCount > 0 ? `${pendingCount} pending enrollment${pendingCount > 1 ? "s" : ""}` : "Manage roster"}
            </Link>
          ) : (
            <EnrollButton
              cohortId={cohortId}
              enrollment={enrollment ? { role: enrollment.role, status: enrollment.status } : null}
              requiresApproval={cohortData.enrollment_requires_approval}
            />
          )}
        </div>

        {/* Tabs — always visible */}
        <CohortTabs tabs={tabs} activeTab={tab} cohortId={cohortId} backHref={backHref ?? undefined} />

        {/* Tab content */}
        {tab === "home" ? (
          canViewContent ? (
            <AnnouncementsSection
              cohortId={cohortId}
              announcements={announcements}
              canPost={canManage}
            />
          ) : (
            <PortalCard>
              <p className="text-sm text-bio-text-muted text-center">
                {enrollment?.status === "pending"
                  ? "Your enrollment is pending approval. You'll get access once approved."
                  : enrollment?.status === "rejected"
                    ? "Your enrollment request was not approved."
                    : "Enroll in this cohort to access course content."}
              </p>
            </PortalCard>
          )
        ) : tab === "modules" && canViewContent ? (
          <ModuleList cohortId={cohortId} modules={modules} canManage={canManage} backHref={backHref ?? undefined} />

        ) : tab === "grades" && canViewContent ? (
          <div className="space-y-4">
            {/* Grade summary */}
            <PortalCard>
              <div className="flex flex-wrap gap-8">
                <div>
                  <p className="text-xs uppercase tracking-wide text-bio-text-muted">Total earned</p>
                  <p className="mt-1 text-3xl font-bold text-bio-green">
                    {gradesEarned}{" "}
                    <span className="text-lg text-bio-text-muted">/ {gradesTotal}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-bio-text-muted">Overall</p>
                  <p className="mt-1 text-3xl font-bold text-bio-green">
                    {overallPct != null ? `${overallPct}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-bio-text-muted">Letter grade</p>
                  <p className="mt-1 text-3xl font-bold text-bio-green">{letterGrade(overallPct)}</p>
                </div>
              </div>
            </PortalCard>

            {/* Grade rows */}
            <PortalCard>
              {myGrades.length === 0 ? (
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
                      {myGrades.map((grade) => {
                        const p = pct(grade.points_earned, grade.assignments?.max_points ?? 100);
                        const item = grade.assignments?.module_items;
                        return (
                          <tr key={grade.id}>
                            <td className="py-3 pr-4 font-medium text-bio-text">
                              {item ? (
                                <Link
                                  href={`/cohorts/${cohortId}/modules/${item.module_id}${backHref ? `?back=${encodeURIComponent(backHref)}` : ""}`}
                                  className="hover:text-bio-green hover:underline"
                                >
                                  {item.title}
                                </Link>
                              ) : (
                                <span className="text-xs italic text-bio-text-muted/60">Unknown</span>
                              )}
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
                              {grade.feedback ?? (
                                <span className="text-xs italic text-bio-text-muted/60">No feedback</span>
                              )}
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

        ) : tab === "roster" && canViewContent ? (
          <div className="space-y-4">
            {/* Pending enrollment approvals — managers only */}
            {canManage && rosterPendingCount > 0 ? (
              <PortalCard>
                <div className="space-y-8">
                  {canManageTeachers && teacherEnrollments.some((e) => e.status === "pending") ? (
                    <EnrollmentReviewTable
                      title="Pending teachers"
                      rows={teacherEnrollments.filter((e) => e.status === "pending")}
                      reviewerNames={reviewerNames}
                      canManage={true}
                    />
                  ) : null}
                  {participantEnrollments.some((e) => e.status === "pending") ? (
                    <div className={canManageTeachers && teacherEnrollments.some((e) => e.status === "pending") ? "border-t border-card-border pt-6" : ""}>
                      <EnrollmentReviewTable
                        title="Pending students"
                        rows={participantEnrollments.filter((e) => e.status === "pending")}
                        reviewerNames={reviewerNames}
                        canManage={true}
                        maxEnrollment={cohortData.max_enrollment}
                      />
                    </div>
                  ) : null}
                </div>
              </PortalCard>
            ) : null}

            {/* Canvas-style people list — visible to all enrolled */}
            <PortalCard>
              <RosterPeopleTable
                entries={peopleList}
                cohortId={cohortId}
                cohortName={cohortData.name}
              />
            </PortalCard>
          </div>
        ) : null}
      </div>
    </PortalPage>
  );
}
