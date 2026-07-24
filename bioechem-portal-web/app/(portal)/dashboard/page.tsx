import type { Metadata } from "next";

import { AdminPortalDashboard } from "@/components/portal/admin-portal-dashboard";
import { AdminPreviewBanner } from "@/components/portal/admin-preview-banner";
import { ParticipantDashboard } from "@/components/portal/participant-dashboard";
import { PartnerDashboard } from "@/components/portal/partner-dashboard";
import { PortalPage } from "@/components/portal/portal-page";
import { SchoolAdminDashboard } from "@/components/portal/school-admin-dashboard";
import { ShareholderDashboard } from "@/components/portal/shareholder-dashboard";
import { TeacherDashboard } from "@/components/portal/teacher-dashboard";
import type { SessionProfile } from "@/lib/auth/session";
import { requireSession } from "@/lib/auth/session";
import { loadAdminDashboardSummary } from "@/lib/dashboard/admin-summary";
import { loadSchoolAdminDashboard } from "@/lib/dashboard/school-admin-data";
import { loadShareholderDashboardData } from "@/lib/dashboard/shareholder-data";
import { loadPartnerDashboardData } from "@/lib/dashboard/partner-data";
import { loadParticipantDashboardData } from "@/lib/dashboard/participant-data";
import {
  buildDashboardUserContext,
  type DashboardProfileRow,
} from "@/lib/dashboard/types";
import { getRoleConfig } from "@/lib/portal/role-config";
import { PORTAL_PROFILE_COMPLETION_SELECT } from "@/lib/portal/profile-select";
import {
  getProfileCompletionStatus,
  type ProfileCompletionFields,
} from "@/lib/profile/completion";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getCohortDisplayName, getDisplayName } from "@/lib/profile/display";

export const metadata: Metadata = {
  title: "Dashboard",
};

type DashboardProfile = SessionProfile &
  DashboardProfileRow &
  ProfileCompletionFields & {
    school_id: string | null;
  };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { as: asUserId } = await searchParams;

  const { supabase, user, profile } = await requireSession<DashboardProfile>({
    requireApproved: true,
    profileSelect: `full_name, email, approval_status, role, school_id, schools(name), cohorts(name), ${PORTAL_PROFILE_COMPLETION_SELECT}`,
  });

  const isBioAdminViewing = profile.role === "bioechem_admin" && !!asUserId;

  // When viewing as another user, swap to their profile data
  let targetProfile: DashboardProfile | null = null;
  let targetUserId = user.id;
  let targetName: string | null = null;
  let targetEmail = user.email ?? "—";

  if (isBioAdminViewing) {
    const db = createServiceRoleClient() ?? supabase;
    const { data: tp } = await db
      .from("profiles")
      .select(`full_name, email, approval_status, role, school_id, schools(name), cohorts(name), ${PORTAL_PROFILE_COMPLETION_SELECT}`)
      .eq("id", asUserId!)
      .maybeSingle<DashboardProfile>();
    if (tp) {
      targetProfile = tp;
      targetUserId = asUserId!;
      targetEmail = tp.email ?? "—";
      targetName = getDisplayName(tp.full_name, tp.email);
    }
  }

  const activeProfile = targetProfile ?? profile;
  const role = activeProfile.role ?? "participant";
  const userContext = buildDashboardUserContext(activeProfile, targetEmail);
  const { dashboardDescription } = getRoleConfig(role);

  // Admin-view banner shown at the top of every dashboard view-as render
  const adminBanner = isBioAdminViewing && targetName ? (
    <AdminPreviewBanner targetName={targetName} targetUserId={asUserId!} action="dashboard" />
  ) : null;

  // Use service role client for target-user data fetches when in view-as mode
  const dataClient = isBioAdminViewing ? (createServiceRoleClient() ?? supabase) : supabase;

  if (role === "school_admin") {
    if (!activeProfile.school_id) {
      return (
        <PortalPage title="Dashboard" description={dashboardDescription}>
          {adminBanner}
          <p className="text-sm text-bio-text-muted">
            {isBioAdminViewing
              ? "This user is not linked to a partner school yet."
              : "Your account is not linked to a partner school yet. Contact "}
            {!isBioAdminViewing && (
              <a
                href="mailto:team@bioechem.com"
                className="font-medium text-bio-green hover:underline"
              >
                team@bioechem.com
              </a>
            )}
            {!isBioAdminViewing && " to finish setup."}
          </p>
        </PortalPage>
      );
    }

    const schoolData = await loadSchoolAdminDashboard(
      dataClient,
      activeProfile.school_id,
      userContext.displayName,
      userContext.email,
    );

    if (!schoolData) {
      return (
        <PortalPage title="Dashboard" description={dashboardDescription}>
          {adminBanner}
          <p className="text-sm text-bio-text-muted">
            Could not load school details. Please try again later.
          </p>
        </PortalPage>
      );
    }

    return (
      <PortalPage
        title="Dashboard"
        description={`Overview for ${schoolData.schoolName}.`}
      >
        {adminBanner}
        <SchoolAdminDashboard data={schoolData} asUserId={isBioAdminViewing ? asUserId : undefined} />
      </PortalPage>
    );
  }

  if (role === "bioechem_admin" && !isBioAdminViewing) {
    const summary = await loadAdminDashboardSummary(supabase);
    return (
      <PortalPage title="Dashboard" description={dashboardDescription}>
        <AdminPortalDashboard user={userContext} summary={summary} />
      </PortalPage>
    );
  }

  if (role === "teacher") {
    const { data: teacherEnrollments } = await dataClient
      .from("cohort_enrollments")
      .select("cohort_id")
      .eq("user_id", targetUserId)
      .eq("role", "teacher")
      .eq("status", "approved");

    const cohortIds = (teacherEnrollments ?? []).map((e) => e.cohort_id as string);
    let studentCount = 0;
    let assignmentCount = 0;
    let pendingGradingCount = 0;
    if (cohortIds.length > 0) {
      const [studentRes, assignmentRes, gradableAssignmentsRes] = await Promise.all([
        dataClient
          .from("cohort_enrollments")
          .select("id", { count: "exact", head: true })
          .in("cohort_id", cohortIds)
          .eq("role", "participant")
          .eq("status", "approved"),
        dataClient
          .from("assignments")
          .select("id", { count: "exact", head: true })
          .in("cohort_id", cohortIds),
        dataClient
          .from("assignments")
          .select("id")
          .in("cohort_id", cohortIds)
          .eq("requires_grading", true),
      ]);
      studentCount = studentRes.count ?? 0;
      assignmentCount = assignmentRes.count ?? 0;

      const gradableAssignmentIds = (gradableAssignmentsRes.data ?? []).map((a) => a.id as string);
      if (gradableAssignmentIds.length > 0) {
        const [submissionsRes, gradesRes] = await Promise.all([
          dataClient
            .from("submissions")
            .select("id")
            .in("assignment_id", gradableAssignmentIds),
          dataClient
            .from("grades")
            .select("submission_id")
            .in("cohort_id", cohortIds),
        ]);
        const gradedSubmissionIds = new Set((gradesRes.data ?? []).map((g) => g.submission_id as string));
        pendingGradingCount = (submissionsRes.data ?? []).filter((s) => !gradedSubmissionIds.has(s.id as string)).length;
      }
    }

    return (
      <PortalPage title="Dashboard" description={dashboardDescription}>
        {adminBanner}
        <TeacherDashboard
          user={userContext}
          stats={{ classCount: cohortIds.length, studentCount, assignmentCount, pendingGradingCount }}
          asUserId={isBioAdminViewing ? asUserId : undefined}
        />
      </PortalPage>
    );
  }

  if (role === "industry_partner") {
    const partnerData = await loadPartnerDashboardData(dataClient);
    return (
      <PortalPage title="Dashboard" description={dashboardDescription}>
        {adminBanner}
        <PartnerDashboard user={userContext} data={partnerData} asUserId={isBioAdminViewing ? asUserId : undefined} />
      </PortalPage>
    );
  }

  if (role === "shareholder") {
    const shareholderData = await loadShareholderDashboardData(
      dataClient,
      createServiceRoleClient(),
    );
    return (
      <PortalPage title="Dashboard" description={dashboardDescription}>
        {adminBanner}
        <ShareholderDashboard user={userContext} data={shareholderData} asUserId={isBioAdminViewing ? asUserId : undefined} />
      </PortalPage>
    );
  }

  const profileCompletion = getProfileCompletionStatus(activeProfile);

  const { data: pendingEnrollmentRows } = await dataClient
    .from("cohort_enrollments")
    .select("cohorts(name)")
    .eq("user_id", targetUserId)
    .eq("status", "pending");

  const pendingCohortNames = (pendingEnrollmentRows ?? [])
    .map((row) => getCohortDisplayName(row.cohorts))
    .filter((name): name is string => !!name);

  const participantData = await loadParticipantDashboardData(dataClient, targetUserId);

  return (
    <PortalPage title="Dashboard" description={dashboardDescription}>
      {adminBanner}
      <ParticipantDashboard
        user={userContext}
        profileCompletion={profileCompletion}
        pendingCohortNames={pendingCohortNames}
        data={participantData}
        asUserId={isBioAdminViewing ? asUserId : undefined}
      />
    </PortalPage>
  );
}
