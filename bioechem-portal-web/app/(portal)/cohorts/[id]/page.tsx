import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Eye } from "lucide-react";
import { notFound } from "next/navigation";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { CohortTabs } from "@/components/cohorts/cohort-tabs";
import { AnnouncementsSection } from "@/components/cohorts/announcements-section";
import { ModuleList } from "@/components/cohorts/module-list";
import { EnrollButton } from "@/components/cohorts/enroll-button";
import { EnrollmentReviewTable, type ReviewableEnrollment, type ReviewerNames } from "@/components/cohorts/enrollment-review-table";
import { RosterPeopleTable, type RosterEntry } from "@/components/cohorts/roster-people-table";
import { ClassroomView, type ClassSession, type SessionRecording } from "@/components/cohorts/classroom/classroom-view";
import { requireSession } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getDisplayName } from "@/lib/profile/display";

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
  visible_to: string[];
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

type AssignmentRow = {
  id: string;
  due_at: string | null;
  max_points: number | null;
  module_item_id: string;
  module_items: {
    id: string;
    title: string;
    module_id: string;
    published: boolean;
  } | null;
  submissions: { id: string; submitted_at: string }[] | null;
};

type SurveyRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  already_responded: boolean;
};


const TYPE_LABEL: Record<string, string> = { halfway: "Halfway", final: "Final", custom: "Custom" };

type CertificateRow = {
  id: string;
  title: string;
  file_url: string;
  filename: string | null;
  uploaded_at: string;
};

function AssignmentsTabContent({
  assignments,
  cohortId,
  backHref,
}: {
  assignments: AssignmentRow[];
  cohortId: string;
  userId: string;
  backHref?: string;
}) {
  const now = new Date();
  const hasSubmission = (a: AssignmentRow) => Array.isArray(a.submissions) ? a.submissions.length > 0 : !!a.submissions;
  const upcoming = assignments.filter(
    (a) => !hasSubmission(a) && (!a.due_at || new Date(a.due_at) >= now)
  );
  const past = assignments.filter(
    (a) => hasSubmission(a) || (a.due_at && new Date(a.due_at) < now)
  );

  function AssignmentList({ rows, emptyMsg }: { rows: AssignmentRow[]; emptyMsg: string }) {
    if (rows.length === 0) return <p className="text-sm text-bio-text-muted">{emptyMsg}</p>;
    return (
      <div className="divide-y divide-card-border">
        {rows.map((a) => {
          const item = a.module_items;
          const href = item
            ? `/cohorts/${cohortId}/assignments/${a.id}${backHref ? `?back=${encodeURIComponent(backHref)}` : ""}`
            : "#";
          const submitted = hasSubmission(a);
          const overdue = !submitted && a.due_at && new Date(a.due_at) < now;
          return (
            <div key={a.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <Link href={href} className="text-sm font-medium text-bio-text hover:text-bio-green">
                  {item?.title ?? "Untitled"}
                </Link>
                {a.due_at ? (
                  <p className={`text-xs mt-0.5 ${overdue ? "text-red-500" : "text-bio-text-muted"}`}>
                    Due {fmt(a.due_at)}
                  </p>
                ) : (
                  <p className="text-xs mt-0.5 text-bio-text-muted">No due date</p>
                )}
              </div>
              <div className="shrink-0">
                {submitted ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Submitted
                  </span>
                ) : overdue ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                    Overdue
                  </span>
                ) : (
                  <Link
                    href={href}
                    className="rounded-full bg-bio-green/10 px-2 py-0.5 text-xs font-medium text-bio-green hover:bg-bio-green/20"
                  >
                    Submit
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PortalCard>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-green">
          Upcoming ({upcoming.length})
        </h2>
        <AssignmentList rows={upcoming} emptyMsg="No upcoming assignments." />
      </PortalCard>
      {past.length > 0 && (
        <PortalCard>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-text-muted">
            Past ({past.length})
          </h2>
          <AssignmentList rows={past} emptyMsg="No past assignments." />
        </PortalCard>
      )}
    </div>
  );
}

function CertificatesTabContent({ certificates }: { certificates: CertificateRow[] }) {
  if (certificates.length === 0) {
    return (
      <PortalCard>
        <p className="text-sm text-bio-text-muted">No certificates issued yet for this cohort.</p>
      </PortalCard>
    );
  }
  return (
    <PortalCard>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">
        Your Certificates ({certificates.length})
      </h2>
      <div className="divide-y divide-card-border">
        {certificates.map((cert) => (
          <div key={cert.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-bio-text">{cert.title}</p>
              <p className="text-xs text-bio-text-muted mt-0.5">
                Issued {new Date(cert.uploaded_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <a
              href={cert.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg border border-bio-green px-3 py-1.5 text-xs font-medium text-bio-green hover:bg-bio-green/10"
            >
              View / Download
            </a>
          </div>
        ))}
      </div>
    </PortalCard>
  );
}

function SurveysTabContent({ surveys }: { surveys: SurveyRow[] }) {
  const available = surveys.filter((s) => !s.already_responded);
  const completed = surveys.filter((s) => s.already_responded);

  return (
    <div className="space-y-4">
      <PortalCard>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-green">
          Available ({available.length})
        </h2>
        {available.length === 0 ? (
          <p className="text-sm text-bio-text-muted">No pending surveys.</p>
        ) : (
          <div className="divide-y divide-card-border">
            {available.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3 gap-3">
                <div>
                  <p className="text-sm font-medium text-bio-text">{s.title}</p>
                  {s.description ? (
                    <p className="text-xs text-bio-text-muted mt-0.5">{s.description}</p>
                  ) : (
                    <p className="text-xs text-bio-text-muted mt-0.5">{TYPE_LABEL[s.type] ?? s.type}</p>
                  )}
                </div>
                <Link
                  href={`/surveys/${s.id}`}
                  className="shrink-0 rounded-full bg-bio-green/10 px-3 py-1 text-xs font-medium text-bio-green hover:bg-bio-green/20"
                >
                  Take survey
                </Link>
              </div>
            ))}
          </div>
        )}
      </PortalCard>
      {completed.length > 0 && (
        <PortalCard>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-text-muted">
            Completed ({completed.length})
          </h2>
          <div className="divide-y divide-card-border">
            {completed.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3 gap-3">
                <div>
                  <p className="text-sm font-medium text-bio-text">{s.title}</p>
                  <p className="text-xs text-bio-text-muted mt-0.5">{TYPE_LABEL[s.type] ?? s.type}</p>
                </div>
                <Link
                  href={`/surveys/${s.id}`}
                  className="shrink-0 text-xs text-bio-text-muted hover:text-bio-green"
                >
                  View response →
                </Link>
              </div>
            ))}
          </div>
        </PortalCard>
      )}
    </div>
  );
}

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
  searchParams: Promise<{ tab?: string; back?: string; as?: string }>;
}) {
  const { id: cohortId } = await params;
  const { tab = "home", back, as: asUserId } = await searchParams;
  const backHref = back?.startsWith("/admin/") ? back : null;

  const { supabase, user, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "approval_status, role, school_id",
  });

  const isBioAdminViewing = profile.role === "bioechem_admin" && !!asUserId;
  const viewingUserId = isBioAdminViewing ? asUserId! : user.id;
  // When admin is viewing as a user, use service role so RLS doesn't block cross-user data reads
  const db = isBioAdminViewing ? (createServiceRoleClient() ?? supabase) : supabase;

  let viewingUserName: string | null = null;
  if (isBioAdminViewing) {
    const { data: vp } = await db.from("profiles").select("full_name, email").eq("id", viewingUserId).maybeSingle<{ full_name: string | null; email: string | null }>();
    viewingUserName = getDisplayName(vp?.full_name ?? null, vp?.email ?? null);
  }

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, name, description, start_date, end_date, max_enrollment, enrollment_requires_approval, status, schools(name)")
    .eq("id", cohortId)
    .single();

  if (!cohort) notFound();

  // Archived cohorts are inaccessible to non-admins
  if (cohort.status === "archived" && profile.role !== "bioechem_admin") {
    return (
      <PortalPage title="Cohort unavailable">
        <PortalCard>
          <div className="py-6 text-center space-y-2">
            <p className="text-base font-semibold text-bio-text">{cohort.name}</p>
            <p className="text-sm text-bio-text-muted">
              This cohort has been archived and is no longer available.
            </p>
          </div>
        </PortalCard>
      </PortalPage>
    );
  }

  const { data: enrollment } = await db
    .from("cohort_enrollments")
    .select("role, status")
    .eq("cohort_id", cohortId)
    .eq("user_id", viewingUserId)
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
  type ContactRow = { id: string; name: string; email: string; title: string | null };
  let cohortContacts: ContactRow[] = [];
  if ((tab === "home" || tab === "modules") && canViewContent) {
    const [annRes, modRes, contactRes] = await Promise.all([
      supabase
        .from("announcements")
        .select("id, title, body, is_pinned, visible_to, created_at, profiles(full_name)")
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
      supabase
        .from("cohort_contacts")
        .select("id, name, email, title")
        .eq("cohort_id", cohortId)
        .order("position")
        .returns<ContactRow[]>(),
    ]);
    announcements = annRes.data ?? [];
    let mods = modRes.data ?? [];
    if (!canManage) mods = mods.filter((m) => m.published);
    modules = mods;
    cohortContacts = contactRes.data ?? [];
  }

  // Fetch assignments for assignments tab
  let cohortAssignments: AssignmentRow[] = [];
  if (tab === "assignments" && canViewContent) {
    const { data } = await db
      .from("assignments")
      .select(`id, due_at, max_points, module_item_id, module_items(id, title, module_id, published), submissions!left(id, submitted_at)`)
      .eq("cohort_id", cohortId)
      .eq("submissions.user_id", viewingUserId)
      .order("due_at", { ascending: true, nullsFirst: false })
      .returns<AssignmentRow[]>();
    cohortAssignments = (data ?? []).filter(
      (a) => canManage || a.module_items?.published
    );
  }

  // Fetch surveys for surveys tab
  let cohortSurveys: SurveyRow[] = [];
  if (tab === "surveys" && canViewContent) {
    const { data: surveys } = await supabase
      .from("surveys")
      .select("id, title, description, type")
      .eq("cohort_id", cohortId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .returns<Omit<SurveyRow, "already_responded">[]>();

    if (surveys && surveys.length > 0) {
      const { data: myResponses } = await db
        .from("survey_responses")
        .select("survey_id")
        .eq("user_id", viewingUserId);
      const respondedIds = new Set(
        (myResponses ?? []).map((r: { survey_id: string }) => r.survey_id)
      );
      cohortSurveys = surveys.map((s) => ({ ...s, already_responded: respondedIds.has(s.id) }));
    }
  }

  // Fetch classroom data for classroom tab
  let classroomSessions: ClassSession[] = [];
  let classroomRecordings: SessionRecording[] = [];
  if (tab === "classroom" && canViewContent) {
    const [sessRes, recRes] = await Promise.all([
      supabase
        .from("class_sessions")
        .select("id, cohort_id, title, description, scheduled_at, duration_minutes, meeting_url, status, created_at")
        .eq("cohort_id", cohortId)
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("session_recordings")
        .select("id, cohort_id, session_id, title, description, video_url, file_path, thumbnail_url, published, created_at")
        .eq("cohort_id", cohortId)
        .order("created_at", { ascending: false }),
    ]);
    classroomSessions = (sessRes.data ?? []) as ClassSession[];
    const allRecs = (recRes.data ?? []) as SessionRecording[];
    classroomRecordings = canManage ? allRecs : allRecs.filter((r) => r.published);
  }

  // Fetch certificates for certificates tab
  let myCertificates: CertificateRow[] = [];
  if (tab === "certificates" && (isApprovedEnrolled || isBioAdminViewing)) {
    const { data } = await db
      .from("certificates")
      .select("id, title, file_url, filename, uploaded_at")
      .eq("cohort_id", cohortId)
      .eq("user_id", viewingUserId)
      .order("uploaded_at", { ascending: false })
      .returns<CertificateRow[]>();
    myCertificates = data ?? [];
  }

  // Fetch grades data when on grades tab
  let myGrades: GradeRow[] = [];
  if (tab === "grades" && canViewContent) {
    const { data } = await db
      .from("grades")
      .select("id, points_earned, feedback, graded_at, assignments(id, max_points, module_items(title, module_id))")
      .eq("cohort_id", cohortId)
      .eq("user_id", viewingUserId)
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
    ...(canViewContent ? [{ key: "assignments", label: "Assignments" }] : []),
    ...(canViewContent ? [{ key: "surveys", label: "Surveys" }] : []),
    ...(canViewContent ? [{ key: "classroom", label: "Classroom" }] : []),
    ...(canViewContent ? [{ key: "grades", label: "Grades" }] : []),
    ...((isApprovedEnrolled || isBioAdminViewing) ? [{ key: "certificates", label: "Certificates" }] : []),
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
      {isBioAdminViewing && viewingUserName ? (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <Eye className="h-4 w-4 shrink-0" />
          <span>Viewing as <strong>{viewingUserName}</strong> — read-only admin preview</span>
          {backHref ? (
            <Link href={backHref} className="ml-auto text-amber-700 underline hover:text-amber-900">Exit preview</Link>
          ) : null}
        </div>
      ) : null}
      {cohortData.status === "archived" && !isAdmin ? (
        <div className="mb-3 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          This cohort has been archived. Content is read-only and no longer accepting submissions.
        </div>
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

          {!isBioAdminViewing && (isAdmin || isTeacher) ? (
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
          ) : !isBioAdminViewing ? (
            <EnrollButton
              cohortId={cohortId}
              enrollment={enrollment ? { role: enrollment.role, status: enrollment.status } : null}
              requiresApproval={cohortData.enrollment_requires_approval}
            />
          ) : null}
        </div>

        {/* Tabs — always visible */}
        <CohortTabs tabs={tabs} activeTab={tab} cohortId={cohortId} backHref={backHref ?? undefined} asUserId={isBioAdminViewing ? asUserId : undefined} />

        {/* Tab content */}
        {tab === "home" ? (
          canViewContent ? (
            <div className="space-y-4">
              <AnnouncementsSection
                cohortId={cohortId}
                announcements={announcements}
                canPost={canManage}
              />
              {cohortContacts.length > 0 && (
                <PortalCard>
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">
                    Cohort contacts
                  </h3>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {cohortContacts.map((c) => (
                      <li key={c.id} className="rounded-xl border border-bio-green/20 bg-bio-mint/40 p-4 space-y-1">
                        <p className="text-base font-semibold text-bio-text">{c.name}</p>
                        {c.title && (
                          <p className="text-sm font-medium text-bio-green">{c.title}</p>
                        )}
                        <a
                          href={`mailto:${c.email}`}
                          className="inline-block text-sm text-bio-text-muted hover:text-bio-green hover:underline break-all"
                        >
                          {c.email}
                        </a>
                      </li>
                    ))}
                  </ul>
                </PortalCard>
              )}
            </div>
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

        ) : tab === "assignments" && canViewContent ? (
          <AssignmentsTabContent
            assignments={cohortAssignments}
            cohortId={cohortId}
            userId={user.id}
            backHref={backHref ?? undefined}
          />

        ) : tab === "surveys" && canViewContent ? (
          <SurveysTabContent surveys={cohortSurveys} />

        ) : tab === "classroom" && canViewContent ? (
          <ClassroomView
            cohortId={cohortId}
            initialSessions={classroomSessions}
            initialRecordings={classroomRecordings}
            canManage={canManage}
          />

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

        ) : tab === "certificates" && isApprovedEnrolled ? (
          <CertificatesTabContent certificates={myCertificates} />

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
