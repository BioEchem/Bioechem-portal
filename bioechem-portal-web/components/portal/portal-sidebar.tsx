"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ExternalLink, Menu, X } from "lucide-react";

import { SignOutButton } from "@/components/brand/sign-out-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getPortalNavSections } from "@/lib/portal/nav";
import { PORTAL_ROUTES } from "@/lib/portal/routes";
import { MAIN_SITE_URL } from "@/lib/brand/site";
import { getInitials, getRoleLabel } from "@/lib/profile/display";

const ROLE_BADGE: Record<string, string> = {
  bioechem_admin: "bg-violet-500/30 text-violet-200",
  school_admin: "bg-sky-500/30 text-sky-200",
  teacher: "bg-amber-500/30 text-amber-200",
  participant: "bg-emerald-500/25 text-emerald-200",
  industry_partner: "bg-teal-500/30 text-teal-200",
  shareholder: "bg-white/15 text-white/70",
};

type PortalSidebarProps = {
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === PORTAL_ROUTES.dashboard || href === PORTAL_ROUTES.account) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalSidebar({ userName, userEmail, userRole }: PortalSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navSections = getPortalNavSections(userRole);

  // Default open to the section that contains the active route
  const defaultSection = navSections.find((s) =>
    s.items.some((item) => isActivePath(pathname, item.href))
  )?.title ?? navSections[0]?.title ?? null;

  const [activeSection, setActiveSection] = useState<string | null>(defaultSection);

  // Update active section when route changes
  useEffect(() => {
    const match = navSections.find((s) =>
      s.items.some((item) => isActivePath(pathname, item.href))
    );
    if (match) setActiveSection(match.title);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const openSection = navSections.find((s) => s.title === activeSection) ?? null;

  const rail = (
    <div className="flex w-14 shrink-0 flex-col items-center border-r border-white/10 py-3 gap-1">
      {/* Logo */}
      <Link
        href={PORTAL_ROUTES.dashboard}
        onClick={() => setMobileOpen(false)}
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-xs font-bold text-white hover:bg-white/25"
        title="BioEchem"
      >
        B
      </Link>

      {/* Section icons */}
      <div className="flex flex-1 flex-col items-center gap-1 w-full px-1">
        {navSections.map((section) => {
          const Icon = section.icon;
          const isOpen = activeSection === section.title;
          const hasActive = section.items.some((item) => isActivePath(pathname, item.href));
          return (
            <button
              key={section.title}
              type="button"
              onClick={() => setActiveSection(isOpen ? null : section.title)}
              title={section.title}
              className={`flex w-full items-center justify-center rounded-lg p-2.5 transition-colors ${
                isOpen
                  ? "bg-white/20 text-white"
                  : hasActive
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="size-5 shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Notification + user avatar at bottom */}
      <div className="flex flex-col items-center gap-2 mt-auto">
        <NotificationBell />
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white cursor-default"
          title={userName ?? userEmail ?? ""}
        >
          {getInitials(userName, userEmail)}
        </div>
      </div>
    </div>
  );

  const subPanel = openSection ? (
    <div className="flex w-52 shrink-0 flex-col border-r border-white/10">
      {/* Section header */}
      <div className="px-4 py-4 border-b border-white/10">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
          {openSection.title}
        </p>
      </div>

      {/* Items */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-1">
          {openSection.items.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — only shown in sub-panel */}
      <div className="border-t border-white/10 px-3 py-3 space-y-1">
        {userName || userEmail ? (
          <div className="px-2 py-1 mb-1">
            {userName && (
              <p className="truncate text-sm font-medium text-white leading-tight">{userName}</p>
            )}
            {userEmail && (
              <p className="truncate text-xs text-white/50 leading-tight">{userEmail}</p>
            )}
            {userRole && (
              <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${ROLE_BADGE[userRole] ?? "bg-white/15 text-white/70"}`}>
                {getRoleLabel(userRole)}
              </span>
            )}
          </div>
        ) : null}
        <SignOutButton className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50" />
        <a
          href={MAIN_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white/70"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          bioechem.com
        </a>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-card-border bg-bio-green-dark px-4 py-3 lg:hidden">
        <Link href={PORTAL_ROUTES.dashboard} className="text-sm font-semibold text-white">
          BioEchem
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="inline-flex size-10 items-center justify-center rounded-lg text-white hover:bg-white/10"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={`shrink-0 bg-bio-green-dark lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-row ${
          mobileOpen ? "flex flex-row" : "hidden lg:flex"
        }`}
      >
        {rail}
        {subPanel}
      </aside>
    </>
  );
}
