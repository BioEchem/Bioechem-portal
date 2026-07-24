import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  Globe,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  ShieldCheck,
  ClipboardCheck,
  User,
  FileStack,
  Award,
  Gift,
  Layers,
  FileEdit,
  CalendarDays,
} from "lucide-react";

import { AUTH_ROUTES } from "@/lib/auth/routes";
import { getRoleConfig } from "@/lib/portal/role-config";
import { PORTAL_ROUTES } from "@/lib/portal/routes";

export type PortalNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type PortalNavSection = {
  title: string;
  icon: LucideIcon;
  items: PortalNavItem[];
};

// Shareholders and industry partners don't take courses, so certificates aren't relevant to them.
const ROLES_WITHOUT_CERTIFICATES = new Set(["shareholder", "industry_partner"]);

function buildAccountSection(role: string | null): PortalNavSection {
  const items: PortalNavItem[] = [
    { label: "Profile", href: PORTAL_ROUTES.account, icon: User },
    { label: "Background", href: PORTAL_ROUTES.background, icon: Briefcase },
    { label: "Password", href: PORTAL_ROUTES.accountPassword, icon: KeyRound },
  ];

  if (!ROLES_WITHOUT_CERTIFICATES.has(role ?? "")) {
    items.push({ label: "Certificates", href: PORTAL_ROUTES.certificates, icon: Award });
  }

  items.push({ label: "Credits", href: PORTAL_ROUTES.credits, icon: Gift });

  return { title: "Account", icon: User, items };
}

const ADMIN_MANAGE_SECTION: PortalNavSection = {
  title: "Manage",
  icon: Layers,
  items: [
    { label: "User Approvals", href: AUTH_ROUTES.adminApprovals, icon: ShieldCheck },
    { label: "Schools", href: AUTH_ROUTES.adminSchools, icon: Building2 },
    { label: "Cohorts", href: AUTH_ROUTES.adminCohorts, icon: GraduationCap },
    { label: "Surveys", href: AUTH_ROUTES.adminSurveys, icon: ClipboardCheck },
    { label: "Analytics", href: AUTH_ROUTES.adminAnalytics, icon: BarChart3 },
    // { label: "Job Postings", href: AUTH_ROUTES.adminJobs, icon: BriefcaseBusiness }, // TODO: re-enable when job postings feature is ready
  ],
};

const ADMIN_CONTENT_SECTION: PortalNavSection = {
  title: "Content",
  icon: FileEdit,
  items: [
    { label: "Website Content", href: AUTH_ROUTES.adminContent, icon: Newspaper },
    { label: "Drive", href: AUTH_ROUTES.adminDrive, icon: FolderOpen },
    { label: "Messages", href: PORTAL_ROUTES.messaging, icon: MessageSquare },
    { label: "Shareholder Documents", href: AUTH_ROUTES.adminShareholderDocs, icon: FileStack },
    { label: "Partner Documents", href: AUTH_ROUTES.adminPartnerDocs, icon: FileStack },
    { label: "Partner Events", href: AUTH_ROUTES.adminPartnerEvents, icon: CalendarDays },
  ],
};

const SCHOOL_ADMIN_SECTION: PortalNavSection = {
  title: "Manage",
  icon: Layers,
  items: [
    { label: "My Cohorts", href: AUTH_ROUTES.adminCohorts, icon: GraduationCap },
  ],
};

function buildPortalItems(role: string | null): PortalNavItem[] {
  const { nav } = getRoleConfig(role);
  const items: PortalNavItem[] = [
    {
      label: "Dashboard",
      href: PORTAL_ROUTES.dashboard,
      icon: LayoutDashboard,
    },
  ];

  if (nav.includeCohorts) {
    items.push({
      label: "Courses",
      href: PORTAL_ROUTES.cohorts,
      icon: GraduationCap,
    });
  }

  if (nav.includeCourses) {
    items.push({
      label: "Courses",
      href: PORTAL_ROUTES.courses,
      icon: BookOpen,
    });
  }

  if (nav.includeAssignments) {
    items.push({
      label: "Assignments",
      href: PORTAL_ROUTES.assignments,
      icon: ClipboardList,
    });
  }

  // Messaging only for non-admin roles — admins access it via Content section
  if (nav.includeMessaging && role !== "bioechem_admin") {
    items.push({
      label: "Messaging",
      href: PORTAL_ROUTES.messaging,
      icon: MessageSquare,
    });
  }

  // Participants, teachers, and school admins belong to a partner school
  // and can see that school's info + contact details.
  if (role === "participant" || role === "teacher" || role === "school_admin") {
    items.push({
      label: "My School",
      href: PORTAL_ROUTES.school,
      icon: Building2,
    });
  }

  if (nav.includeSurveys) {
    items.push({
      label: "Surveys",
      href: PORTAL_ROUTES.surveys,
      icon: ClipboardCheck,
    });
  }

  // TODO: re-enable when job postings feature is ready
  // items.push({
  //   label: "Jobs",
  //   href: PORTAL_ROUTES.jobs,
  //   icon: BriefcaseBusiness,
  // });

  if (nav.includeShareholderDocs) {
    items.push({
      label: "Documents",
      href: PORTAL_ROUTES.shareholderDocs,
      icon: FileStack,
    });
  }

  if (nav.includePartnerContent) {
    items.push({
      label: "Documents",
      href: PORTAL_ROUTES.partnerDocs,
      icon: FileStack,
    });
    items.push({
      label: "Events",
      href: PORTAL_ROUTES.partnerEvents,
      icon: CalendarDays,
    });
  }

  return items;
}

const WEBSITE_SECTION: PortalNavSection = {
  title: "Website",
  icon: Globe,
  items: [
    { label: "Home", href: "/", icon: Globe },
  ],
};

/** Portal sidebar sections tailored to the signed-in user's role. */
export function getPortalNavSections(role: string | null): PortalNavSection[] {
  const sections: PortalNavSection[] = [
    { title: "Portal", icon: LayoutDashboard, items: buildPortalItems(role) },
  ];

  if (role === "bioechem_admin") {
    sections.push(ADMIN_MANAGE_SECTION);
    sections.push(ADMIN_CONTENT_SECTION);
  } else if (role === "school_admin") {
    sections.push(SCHOOL_ADMIN_SECTION);
  }

  sections.push(buildAccountSection(role));
  sections.push(WEBSITE_SECTION);
  return sections;
}
