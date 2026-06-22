import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  Building2,
  ClipboardList,
  GraduationCap,
  Home,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  ShieldCheck,
  User,
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
  items: PortalNavItem[];
};

const ACCOUNT_SECTION: PortalNavSection = {
  title: "Account",
  items: [
    { label: "Profile", href: PORTAL_ROUTES.account, icon: User },
    { label: "Background", href: PORTAL_ROUTES.background, icon: Briefcase },
    { label: "Password", href: PORTAL_ROUTES.accountPassword, icon: KeyRound },
  ],
};

const ADMIN_SECTION: PortalNavSection = {
  title: "Administration",
  items: [
    { label: "User approvals", href: AUTH_ROUTES.adminApprovals, icon: ShieldCheck },
    { label: "Schools", href: AUTH_ROUTES.adminSchools, icon: Building2 },
    { label: "Cohorts", href: AUTH_ROUTES.adminCohorts, icon: GraduationCap },
    { label: "Website Content", href: AUTH_ROUTES.adminContent, icon: Newspaper },
  ],
};

const SCHOOL_ADMIN_SECTION: PortalNavSection = {
  title: "Administration",
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

  if (nav.includeMessaging) {
    items.push({
      label: "Messaging",
      href: PORTAL_ROUTES.messaging,
      icon: MessageSquare,
    });
  }

  return items;
}

const WEBSITE_SECTION: PortalNavSection = {
  title: "Website",
  items: [
    { label: "Home", href: "/", icon: Home },
  ],
};

/** Portal sidebar sections tailored to the signed-in user's role. */
export function getPortalNavSections(role: string | null): PortalNavSection[] {
  const sections: PortalNavSection[] = [
    { title: "Portal", items: buildPortalItems(role) },
  ];

  if (role === "bioechem_admin") {
    sections.push(ADMIN_SECTION);
  } else if (role === "school_admin") {
    sections.push(SCHOOL_ADMIN_SECTION);
  }

  sections.push(ACCOUNT_SECTION);
  sections.push(WEBSITE_SECTION);
  return sections;
}
