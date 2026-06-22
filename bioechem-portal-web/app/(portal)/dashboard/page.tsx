import type { Metadata } from "next";

import { AdminPortalDashboard } from "@/components/portal/admin-portal-dashboard";
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

export const metadata: Metadata = {
  title: "Dashboard",
};

type DashboardProfile = SessionProfile &
  DashboardProfileRow &
  ProfileCompletionFields & {
    school_id: string | null;
  };

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireSession<DashboardProfile>({
    requireApproved: true,
    profileSelect: `full_name, email, approval_status, role, school_id, schools(name), cohorts(name), ${PORTAL_PROFILE_COMPLETION_SELECT}`,
  });

  const role = profile.role ?? "participant";
  const userContext = buildDashboardUserContext(profile, user.email ?? "—");
  const { dashboardDescription } = getRoleConfig(role);

  if (role === "school_admin") {
    if (!profile.school_id) {
      return (
        <PortalPage title="Dashboard" description={dashboardDescription}>
          <p className="text-sm text-bio-text-muted">
            Your account is not linked to a partner school yet. Contact{" "}
            <a
              href="mailto:team@bioechem.com"
              className="font-medium text-bio-green hover:underline"
            >
              team@bioechem.com
            </a>{" "}
            to finish setup.
          </p>
        </PortalPage>
      );
    }

    const schoolData = await loadSchoolAdminDashboard(
      supabase,
      profile.school_id,
      userContext.displayName,
      userContext.email,
    );

    if (!schoolData) {
      return (
        <PortalPage title="Dashboard" description={dashboardDescription}>
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
        <SchoolAdminDashboard data={schoolData} />
      </PortalPage>
    );
  }

  if (role === "bioechem_admin") {
    const summary = await loadAdminDashboardSummary(supabase);
    return (
      <PortalPage title="Dashboard" description={dashboardDescription}>
        <AdminPortalDashboard user={userContext} summary={summary} />
      </PortalPage>
    );
  }

  if (role === "teacher") {
    // Fetch teacher's approved cohort enrollments and student counts
    const { data: teacherEnrollments } = await supabase
      .from("cohort_enrollments")
      .select("cohort_id")
      .eq("user_id", user.id)
      .eq("role", "teacher")
      .eq("status", "approved");

    const cohortIds = (teacherEnrollments ?? []).map((e) => e.cohort_id as string);
    let studentCount = 0;
    let assignmentCount = 0;
    if (cohortIds.length > 0) {
      const [studentRes, assignmentRes] = await Promise.all([
        supabase
          .from("cohort_enrollments")
          .select("id", { count: "exact", head: true })
          .in("cohort_id", cohortIds)
          .eq("role", "participant")
          .eq("status", "approved"),
        supabase
          .from("assignments")
          .select("id", { count: "exact", head: true })
          .in("cohort_id", cohortIds),
      ]);
      studentCount = studentRes.count ?? 0;
      assignmentCount = assignmentRes.count ?? 0;
    }

    return (
      <PortalPage title="Dashboard" description={dashboardDescription}>
        <TeacherDashboard
          user={userContext}
          stats={{ classCount: cohortIds.length, studentCount, assignmentCount }}
        />
      </PortalPage>
    );
  }

  if (role === "industry_partner") {
    return (
      <PortalPage title="Dashboard" description={dashboardDescription}>
        <PartnerDashboard user={userContext} />
      </PortalPage>
    );
  }

  if (role === "shareholder") {
    return (
      <PortalPage title="Dashboard" description={dashboardDescription}>
        <ShareholderDashboard user={userContext} />
      </PortalPage>
    );
  }

  const profileCompletion = getProfileCompletionStatus(profile);

  return (
    <PortalPage title="Dashboard" description={dashboardDescription}>
      <ParticipantDashboard user={userContext} profileCompletion={profileCompletion} />
    </PortalPage>
  );
}
