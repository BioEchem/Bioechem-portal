import type { LucideIcon } from "lucide-react";
import {
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
  Layers,
  FileEdit,
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

const ACCOUNT_SECTION: PortalNavSection = {
  title: "Account",
  icon: User,
  items: [
    { label: "Profile", href: PORTAL_ROUTES.account, icon: User },
    { label: "Background", href: PORTAL_ROUTES.background, icon: Briefcase },
    { label: "Password", href: PORTAL_ROUTES.accountPassword, icon: KeyRound },
    { label: "Certificates", href: PORTAL_ROUTES.certificates, icon: Award },
  ],
};

const ADMIN_MANAGE_SECTION: PortalNavSection = {
  title: "Manage",
  icon: Layers,
  items: [
    { label: "User Approvals", href: AUTH_ROUTES.adminApprovals, icon: ShieldCheck },
    { label: "Schools", href: AUTH_ROUTES.adminSchools, icon: Building2 },
    { label: "Cohorts", href: AUTH_ROUTES.adminCohorts, icon: GraduationCap },
    { label: "Surveys", href: AUTH_ROUTES.adminSurveys, icon: ClipboardCheck },
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

  sections.push(ACCOUNT_SECTION);
  sections.push(WEBSITE_SECTION);
  return sections;
}
