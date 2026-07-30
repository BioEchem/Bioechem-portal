import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { AdminPreviewBanner } from "@/components/portal/admin-preview-banner";
import { CohortTabs } from "@/components/cohorts/cohort-tabs";
import { AnnouncementsSection } from "@/components/cohorts/announcements-section";
import { ModuleList } from "@/components/cohorts/module-list";
import { EnrollButton } from "@/components/cohorts/enroll-button";
import { EnrollmentReviewTable, type ReviewableEnrollment, type ReviewerNames } from "@/components/cohorts/enrollment-review-table";
import { RosterPeopleTable, type RosterEntry } from "@/components/cohorts/roster-people-table";
import { ClassroomView, type ClassSession, type SessionRecording } from "@/components/cohorts/classroom/classroom-view";
import { CareerPathSelfSection, CareerPathManagerSection } from "@/components/cohorts/career-path-section";
import { CohortFeedbackSelfSection, CohortFeedbackManagerSection } from "@/components/cohorts/cohort-feedback-section";
import { AssignmentDetailBody } from "@/components/cohorts/assignment-detail-body";
import { ModuleDetailBody } from "@/components/cohorts/module-detail-body";
import { requireSession } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getDisplayName } from "@/lib/profile/display";
import { formatShortDate as fmt } from "@/lib/format/date";
import { letterGrade as computeLetterGrade, pct } from "@/lib/grades/format";
import { buildCohortTabs } from "@/lib/cohorts/tabs";

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

type ClassGradeRow = {
  userId: string;
  name: string;
  email: string | null;
  earned: number;
  max: number;
  pct: number | null;
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
  submittedCount?: number;
  ungradedCount?: number;
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
  canManage,
  isBioAdminViewing,
}: {
  assignments: AssignmentRow[];
  cohortId: string;
  userId: string;
  backHref?: string;
  canManage: boolean;
  isBioAdminViewing?: boolean;
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
            ? `/cohorts/${cohortId}?tab=assignments&assignmentId=${a.id}${backHref ? `&back=${encodeURIComponent(backHref)}` : ""}`
            : "#";
          const submitted = hasSubmission(a);
          const overdue = !submitted && a.due_at && new Date(a.due_at) < now;
          return (
            <div key={a.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                {isBioAdminViewing ? (
                  <p className="text-sm font-medium text-bio-text">{item?.title ?? "Untitled"}</p>
                ) : (
                  <Link href={href} className="text-sm font-medium text-bio-text hover:text-bio-green">
                    {item?.title ?? "Untitled"}
                  </Link>
                )}
                {a.due_at ? (
                  <p className={`text-xs mt-0.5 ${overdue ? "text-red-500" : "text-bio-text-muted"}`}>
                    Due {fmt(a.due_at)}
                  </p>
                ) : (
                  <p className="text-xs mt-0.5 text-bio-text-muted">No due date</p>
                )}
              </div>
              {!canManage ? (
                <div className="shrink-0">
                  {submitted ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Submitted
                    </span>
                  ) : overdue ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                      Overdue
                    </span>
                  ) : isBioAdminViewing ? (
                    <span className="rounded-full bg-bio-green/10 px-2 py-0.5 text-xs font-medium text-bio-green">
                      Not submitted
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
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  {(a.ungradedCount ?? 0) > 0 ? (
                    <Link
                      href={href}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-200"
                    >
                      {a.ungradedCount} ungraded
                    </Link>
                  ) : (a.submittedCount ?? 0) > 0 ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      All graded
                    </span>
                  ) : (
                    <span className="rounded-full bg-bio-text-muted/10 px-2 py-0.5 text-xs text-bio-text-muted">
                      No submissions yet
                    </span>
                  )}
                </div>
              )}
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

function SurveysTabContent({ surveys, isBioAdminViewing }: { surveys: SurveyRow[]; isBioAdminViewing?: boolean }) {
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
                {isBioAdminViewing ? (
                  <span className="shrink-0 rounded-full bg-bio-green/10 px-3 py-1 text-xs font-medium text-bio-green">
                    Not taken
                  </span>
                ) : (
                  <Link
                    href={`/surveys/${s.id}`}
                    className="shrink-0 rounded-full bg-bio-green/10 px-3 py-1 text-xs font-medium text-bio-green hover:bg-bio-green/20"
                  >
                    Take survey
                  </Link>
                )}
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
                {isBioAdminViewing ? (
                  <span className="shrink-0 text-xs text-bio-text-muted">Responded</span>
                ) : (
                  <Link
                    href={`/surveys/${s.id}`}
                    className="shrink-0 text-xs text-bio-text-muted hover:text-bio-green"
                  >
                    View response →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </PortalCard>
      )}
    </div>
  );
}

function letterGrade(p: number | null): string {
  return computeLetterGrade(p) ?? "—";
}

export default async function CohortHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; back?: string; as?: string; assignmentId?: string; moduleId?: string }>;
}) {
  const { id: cohortId } = await params;
  const { tab = "home", back, as: asUserId, assignmentId, moduleId } = await searchParams;
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
    .select("id, name, description, start_date, end_date, max_enrollment, enrollment_requires_approval, status, school_id, schools(name)")
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

  const schoolAdminProfile = profile as typeof profile & { school_id: string | null };
  const isBioAdmin = profile.role === "bioechem_admin";
  const isSchoolAdmin =
    profile.role === "school_admin" &&
    !!cohort.school_id &&
    schoolAdminProfile.school_id === cohort.school_id;
  const isTeacher = enrollment?.role === "teacher" && enrollment?.status === "approved";
  const isAdmin = isBioAdmin || isSchoolAdmin;
  // While previewing another user's view ("View as user"), never expose management
  // actions — the preview must stay strictly read-only regardless of the real
  // admin's own role or the viewed user's role.
  const canManage = !isBioAdminViewing && (isAdmin || isTeacher);
  const isApprovedEnrolled = enrollment?.status === "approved";
  const canViewContent = canManage || isApprovedEnrolled;

  let pendingCount = 0;
  let ungradedTotalCount = 0;
  if (canManage) {
    const { count } = await supabase
      .from("cohort_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("cohort_id", cohortId)
      .eq("status", "pending");
    pendingCount = count ?? 0;

    const { data: gradableAssignmentIds } = await supabase
      .from("assignments")
      .select("id")
      .eq("cohort_id", cohortId)
      .eq("requires_grading", true);
    const assignmentIds = (gradableAssignmentIds ?? []).map((a) => a.id as string);
    if (assignmentIds.length > 0) {
      const [{ data: submissionsForCount }, { data: gradesForCount }] = await Promise.all([
        supabase.from("submissions").select("id").in("assignment_id", assignmentIds),
        supabase.from("grades").select("submission_id").in("assignment_id", assignmentIds),
      ]);
      const gradedIds = new Set((gradesForCount ?? []).map((g) => g.submission_id as string));
      ungradedTotalCount = (submissionsForCount ?? []).filter((s) => !gradedIds.has(s.id as string)).length;
    }
  }

  // Fetch home/modules content
  let announcements: AnnouncementRow[] = [];
  let modules: ModuleRow[] = [];
  type ContactRow = { id: string; name: string; email: string; title: string | null };
  let cohortContacts: ContactRow[] = [];
  if ((tab === "home" || (tab === "modules" && !moduleId)) && canViewContent) {
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

  // Fetch assignments for assignments tab (list view only — a specific
  // assignmentId renders AssignmentDetailBody instead, which fetches its own data)
  let cohortAssignments: AssignmentRow[] = [];
  if (tab === "assignments" && canViewContent && !assignmentId) {
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

    // Managers need aggregate submitted/ungraded counts across all
    // participants, not just their own — the query above scopes
    // `submissions` to the viewer, which is meaningless for a teacher/admin.
    if (canManage && cohortAssignments.length > 0) {
      const assignmentIds = cohortAssignments.map((a) => a.id);
      const [{ data: allSubmissions }, { data: allGrades }] = await Promise.all([
        db.from("submissions").select("id, assignment_id").in("assignment_id", assignmentIds),
        db.from("grades").select("submission_id, assignment_id").in("assignment_id", assignmentIds),
      ]);
      const gradedSubmissionIds = new Set((allGrades ?? []).map((g) => g.submission_id as string));
      const submittedCountByAssignment = new Map<string, number>();
      const ungradedCountByAssignment = new Map<string, number>();
      for (const s of allSubmissions ?? []) {
        const aId = s.assignment_id as string;
        submittedCountByAssignment.set(aId, (submittedCountByAssignment.get(aId) ?? 0) + 1);
        if (!gradedSubmissionIds.has(s.id as string)) {
          ungradedCountByAssignment.set(aId, (ungradedCountByAssignment.get(aId) ?? 0) + 1);
        }
      }
      cohortAssignments = cohortAssignments.map((a) => ({
        ...a,
        submittedCount: submittedCountByAssignment.get(a.id) ?? 0,
        ungradedCount: ungradedCountByAssignment.get(a.id) ?? 0,
      }));
    }
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

  // Fetch grades data when on grades tab. Teachers/admins see a class-wide
  // overview (everyone's totals); participants see just their own grades.
  let myGrades: GradeRow[] = [];
  let classGrades: ClassGradeRow[] = [];
  if (tab === "grades" && canViewContent) {
    if (canManage) {
      const [{ data: participantRows }, { data: allGrades }] = await Promise.all([
        supabase
          .from("cohort_enrollments")
          .select("user_id, profiles!user_id(full_name, email)")
          .eq("cohort_id", cohortId)
          .eq("role", "participant")
          .eq("status", "approved"),
        supabase
          .from("grades")
          .select("user_id, points_earned, assignments(max_points)")
          .eq("cohort_id", cohortId),
      ]);

      const totalsByUser = new Map<string, { earned: number; max: number }>();
      for (const g of allGrades ?? []) {
        const uid = g.user_id as string;
        const current = totalsByUser.get(uid) ?? { earned: 0, max: 0 };
        current.earned += g.points_earned ?? 0;
        const assignmentRaw = g.assignments as unknown;
        const assignmentMax = Array.isArray(assignmentRaw)
          ? (assignmentRaw[0] as { max_points: number } | undefined)?.max_points
          : (assignmentRaw as { max_points: number } | null)?.max_points;
        current.max += assignmentMax ?? 0;
        totalsByUser.set(uid, current);
      }

      classGrades = (participantRows ?? []).map((p) => {
        const profile = p.profiles as unknown as { full_name: string | null; email: string | null } | null;
        const totals = totalsByUser.get(p.user_id as string) ?? { earned: 0, max: 0 };
        return {
          userId: p.user_id as string,
          name: profile?.full_name ?? profile?.email ?? "Unknown",
          email: profile?.email ?? null,
          earned: totals.earned,
          max: totals.max,
          pct: totals.max > 0 ? pct(totals.earned, totals.max) : null,
        };
      }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    } else {
      const { data } = await db
        .from("grades")
        .select("id, points_earned, feedback, graded_at, assignments(id, max_points, module_items(title, module_id))")
        .eq("cohort_id", cohortId)
        .eq("user_id", viewingUserId)
        .order("graded_at", { ascending: false })
        .returns<GradeRow[]>();
      myGrades = data ?? [];
    }
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

  const tabs = buildCohortTabs({
    canViewContent,
    canManage,
    isApprovedEnrolled,
    isBioAdminViewing,
    pendingCount,
    ungradedTotalCount,
  });

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
        <div className="mb-3">
          <AdminPreviewBanner targetName={viewingUserName} targetUserId={viewingUserId} action="this cohort" />
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
        ) : tab === "modules" && canViewContent && moduleId && !isBioAdminViewing ? (
          <ModuleDetailBody cohortId={cohortId} moduleId={moduleId} />

        ) : tab === "modules" && canViewContent ? (
          <ModuleList cohortId={cohortId} modules={modules} canManage={canManage} backHref={backHref ?? undefined} isBioAdminViewing={isBioAdminViewing} />

        ) : tab === "assignments" && canViewContent && assignmentId && !isBioAdminViewing ? (
          <AssignmentDetailBody cohortId={cohortId} assignmentId={assignmentId} />

        ) : tab === "assignments" && canViewContent ? (
          <AssignmentsTabContent
            assignments={cohortAssignments}
            cohortId={cohortId}
            userId={user.id}
            backHref={backHref ?? undefined}
            canManage={canManage}
            isBioAdminViewing={isBioAdminViewing}
          />

        ) : tab === "surveys" && canViewContent ? (
          <SurveysTabContent surveys={cohortSurveys} isBioAdminViewing={isBioAdminViewing} />

        ) : tab === "classroom" && canViewContent ? (
          <ClassroomView
            cohortId={cohortId}
            initialSessions={classroomSessions}
            initialRecordings={classroomRecordings}
            canManage={canManage}
          />

        ) : tab === "grades" && canViewContent && canManage ? (
          <div className="space-y-4">
            {/* Class-wide summary */}
            <PortalCard>
              <div className="flex flex-wrap gap-8">
                <div>
                  <p className="text-xs uppercase tracking-wide text-bio-text-muted">Class average</p>
                  <p className="mt-1 text-3xl font-bold text-bio-green">
                    {classGrades.filter((c) => c.pct != null).length > 0
                      ? `${Math.round(
                          classGrades.filter((c) => c.pct != null).reduce((s, c) => s + (c.pct ?? 0), 0) /
                            classGrades.filter((c) => c.pct != null).length,
                        )}%`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-bio-text-muted">Participants</p>
                  <p className="mt-1 text-3xl font-bold text-bio-green">{classGrades.length}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-bio-text-muted">Graded so far</p>
                  <p className="mt-1 text-3xl font-bold text-bio-green">
                    {classGrades.filter((c) => c.pct != null).length}
                  </p>
                </div>
              </div>
            </PortalCard>

            {/* Per-student breakdown */}
            <PortalCard>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">Individual grades</h2>
                <Link
                  href={`/cohorts/${cohortId}?tab=roster`}
                  className="text-xs font-medium text-bio-green hover:underline"
                >
                  View full breakdown in Roster →
                </Link>
              </div>
              {classGrades.length === 0 ? (
                <p className="text-sm text-bio-text-muted">No approved participants yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-card-border text-left text-xs text-bio-text-muted">
                        <th className="pb-2 pr-4 font-medium">Student</th>
                        <th className="pb-2 pr-4 font-medium">Score</th>
                        <th className="pb-2 pr-4 font-medium">%</th>
                        <th className="pb-2 font-medium">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {classGrades.map((c) => (
                        <tr key={c.userId}>
                          <td className="py-3 pr-4 font-medium text-bio-text">{c.name}</td>
                          <td className="py-3 pr-4 text-bio-text">{c.earned} / {c.max}</td>
                          <td className="py-3 pr-4 text-bio-text-muted">{c.pct != null ? `${c.pct}%` : "—"}</td>
                          <td className="py-3">
                            <span className={`font-semibold ${
                              c.pct == null ? "text-bio-text-muted"
                              : c.pct >= 90 ? "text-bio-green"
                              : c.pct >= 70 ? "text-amber-600"
                              : "text-red-500"
                            }`}>
                              {letterGrade(c.pct)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </PortalCard>
          </div>

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
                                  href={`/cohorts/${cohortId}?tab=modules&moduleId=${item.module_id}${backHref ? `&back=${encodeURIComponent(backHref)}` : ""}`}
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

        ) : tab === "career_path" && canViewContent ? (
          canManage ? (
            <CareerPathManagerSection cohortId={cohortId} />
          ) : isBioAdminViewing ? (
            <PortalCard>
              <p className="text-sm text-bio-text-muted">
                Career path editing is disabled while previewing as another user.
              </p>
            </PortalCard>
          ) : (
            <CareerPathSelfSection cohortId={cohortId} />
          )

        ) : tab === "feedback" && canViewContent ? (
          canManage ? (
            <CohortFeedbackManagerSection cohortId={cohortId} />
          ) : isBioAdminViewing ? (
            <PortalCard>
              <p className="text-sm text-bio-text-muted">
                Feedback submission is disabled while previewing as another user.
              </p>
            </PortalCard>
          ) : (
            <CohortFeedbackSelfSection cohortId={cohortId} />
          )

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
