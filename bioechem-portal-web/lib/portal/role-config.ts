import type { SignupRole } from "@/lib/auth/types";

type RoleNavConfig = {
  includeCohorts: boolean;
  includeCourses: boolean;
  includeAssignments: boolean;
  includeMessaging: boolean;
};

export type RoleConfig = {
  dashboardDescription: string;
  welcomeSubtitle: string;
  nav: RoleNavConfig;
};

const PARTICIPANT_NAV: RoleNavConfig = {
  includeCohorts: true,
  includeCourses: false,
  includeAssignments: true,
  includeMessaging: true,
};

export const ROLE_CONFIG: Record<SignupRole, RoleConfig> = {
  participant: {
    dashboardDescription: "Your student home in the portal.",
    welcomeSubtitle:
      "Your student dashboard — track courses, assignments, and grades in one place.",
    nav: PARTICIPANT_NAV,
  },
  teacher: {
    dashboardDescription: "Your teaching overview.",
    welcomeSubtitle:
      "Your teaching dashboard — manage classes, assignments, and student progress.",
    nav: PARTICIPANT_NAV,
  },
  school_admin: {
    dashboardDescription: "Your school admin home.",
    welcomeSubtitle: "School admin dashboard — overview, cohorts, and rosters.",
    nav: {
      includeCohorts: false,
      includeCourses: false,
      includeAssignments: false,
      includeMessaging: true,
    },
  },
  industry_partner: {
    dashboardDescription: "Your industry partner hub.",
    welcomeSubtitle:
      "Your industry partner dashboard — explore collaborations, schools, and BioEchem programs.",
    nav: {
      includeCohorts: false,
      includeCourses: false,
      includeAssignments: false,
      includeMessaging: true,
    },
  },
  shareholder: {
    dashboardDescription: "Your shareholder home.",
    welcomeSubtitle:
      "Your shareholder dashboard — company updates, reports, and governance information.",
    nav: {
      includeCohorts: false,
      includeCourses: false,
      includeAssignments: false,
      includeMessaging: false,
    },
  },
  bioechem_admin: {
    dashboardDescription: "BioEchem platform overview.",
    welcomeSubtitle:
      "BioEchem admin dashboard — monitor portal users, approvals, and platform activity.",
    nav: {
      includeCohorts: false,
      includeCourses: false,
      includeAssignments: false,
      includeMessaging: false,
    },
  },
};

const DEFAULT_ROLE_CONFIG = ROLE_CONFIG.participant;

export function getRoleConfig(role: string | null): RoleConfig {
  if (role && role in ROLE_CONFIG) {
    return ROLE_CONFIG[role as SignupRole];
  }
  return DEFAULT_ROLE_CONFIG;
}
