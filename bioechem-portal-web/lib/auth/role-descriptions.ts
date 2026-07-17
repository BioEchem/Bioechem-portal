import type { SignupRole } from "@/lib/auth/types";

type RoleDescription = {
  label: string;
  /** Short one-liner shown under the signup dropdown and on the homepage. */
  blurb: string;
  /** "What you can do" bullets shown on the full /roles page. */
  features: string[];
  /** Who this role is meant for — shown on the full /roles page. */
  audience: string;
};

/**
 * Public-facing copy explaining who each role is for. Used on the homepage
 * "Who is this for?" section, inline under the signup role picker, and on
 * the standalone /roles page — so first-time visitors know which option to
 * pick no matter where they land.
 */
export const ROLE_DESCRIPTIONS: Record<SignupRole, RoleDescription> = {
  participant: {
    label: "Participant",
    audience: "Students enrolled in a BioEchem program.",
    blurb: "A student joining a BioEchem program — access your courses, assignments, and grades.",
    features: [
      "View your cohort's modules and coursework",
      "Submit assignments and quizzes, and track grades",
      "Message BioEchem staff directly",
      "Download certificates once you complete a program",
    ],
  },
  teacher: {
    label: "Teacher",
    audience: "Educators teaching a BioEchem class at a partner school.",
    blurb: "You teach a BioEchem class at a partner school — manage your classroom, grade work, and message students.",
    features: [
      "Manage your classroom's modules, assignments, and quizzes",
      "Grade student submissions and track progress",
      "View your class roster and schedule sessions",
      "Message students and BioEchem staff",
    ],
  },
  school_admin: {
    label: "School admin",
    audience: "Staff who coordinate BioEchem programs at a partner school.",
    blurb: "You coordinate BioEchem programs at your school — manage cohorts, rosters, and enrollment approvals.",
    features: [
      "Oversee all of your school's cohorts and rosters",
      "Approve or reject student and teacher enrollments",
      "See program-level progress across your school",
      "Message BioEchem staff",
    ],
  },
  industry_partner: {
    label: "Industry partner",
    audience: "Companies and organizations partnering with BioEchem.",
    blurb: "You represent a company partnering with BioEchem — view shared reports and your own document folder.",
    features: [
      "View impact reports and collateral shared by BioEchem",
      "Access your own private folder for contracts, invoices, and other paperwork",
      "Upload documents BioEchem needs from you (e.g. a signed W9)",
      "Message BioEchem staff directly",
    ],
  },
  shareholder: {
    label: "Shareholder",
    audience: "Individuals or entities holding a stake in BioEchem.",
    blurb: "You hold a stake in BioEchem — access financial reports, governance updates, and company documents.",
    features: [
      "View financial reports and governance documents",
      "See company-wide impact metrics (schools, cohorts, students reached)",
      "Get notified when new documents relevant to you are shared",
      "Message BioEchem staff directly",
    ],
  },
  bioechem_admin: {
    label: "BioEchem admin",
    audience: "Internal BioEchem staff only.",
    blurb: "Internal BioEchem staff account — full administrative access. Contact the team if you need this role.",
    features: [
      "Approve new accounts and manage every role across the portal",
      "Create and manage schools, cohorts, and course content",
      "Review analytics — retention, engagement, and certificate rates",
      "Manage documents shared with partners and shareholders",
    ],
  },
};

/** Roles shown on the homepage "Who is this for?" section (excludes internal staff). */
export const PUBLIC_FACING_ROLES: SignupRole[] = [
  "participant",
  "teacher",
  "school_admin",
  "industry_partner",
  "shareholder",
];
