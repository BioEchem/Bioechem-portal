export type CohortTab = { key: string; label: string; badge?: number };

/**
 * Builds the cohort tab bar. Shared by the cohort page itself and every
 * drill-down page (module item, assignment, quiz) so the tab bar stays
 * visible and consistent no matter how deep you navigate.
 */
export function buildCohortTabs({
  canViewContent,
  canManage,
  isApprovedEnrolled,
  isBioAdminViewing = false,
  pendingCount = 0,
  ungradedTotalCount = 0,
}: {
  canViewContent: boolean;
  canManage: boolean;
  isApprovedEnrolled: boolean;
  isBioAdminViewing?: boolean;
  pendingCount?: number;
  ungradedTotalCount?: number;
}): CohortTab[] {
  return [
    { key: "home", label: "Home" },
    ...(canViewContent ? [{ key: "modules", label: "Modules" }] : []),
    ...(canViewContent ? [{ key: "assignments", label: "Assignments", badge: canManage ? ungradedTotalCount : 0 }] : []),
    ...(canViewContent ? [{ key: "surveys", label: "Surveys" }] : []),
    ...(canViewContent ? [{ key: "classroom", label: "Classroom" }] : []),
    ...(canViewContent ? [{ key: "grades", label: "Grades" }] : []),
    ...(canViewContent ? [{ key: "career_path", label: "Career Path" }] : []),
    ...(canViewContent ? [{ key: "feedback", label: "Feedback" }] : []),
    ...((isApprovedEnrolled || isBioAdminViewing) ? [{ key: "certificates", label: "Certificates" }] : []),
    ...(canViewContent ? [{ key: "roster", label: "Roster", badge: canManage ? pendingCount : 0 }] : []),
  ];
}
