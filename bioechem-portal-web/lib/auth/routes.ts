/** Portal route paths — use these instead of hardcoded strings. */

export const AUTH_ROUTES = {
  home: "/",
  login: "/auth/login",
  signup: "/auth/signup",
  dashboard: "/dashboard",
  schoolHub: "/school",
  pendingApproval: "/pending-approval",
  accessDenied: "/access-denied",
  adminApprovals: "/admin/approvals",
} as const;

export type AuthRoute = (typeof AUTH_ROUTES)[keyof typeof AUTH_ROUTES];
