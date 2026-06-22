/** Auth and onboarding route paths. */

export const AUTH_ROUTES = {
  home: "/",
  login: "/auth/login",
  signup: "/auth/signup",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
  dashboard: "/dashboard",
  pendingApproval: "/pending-approval",
  completeProfile: "/complete-profile",
  accessDenied: "/access-denied",
  adminApprovals: "/admin/approvals",
  adminSchools: "/admin/schools",
  adminCohorts: "/admin/cohorts",
  adminContent: "/admin/content",
} as const;
