"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ExternalLink, LogOut, Menu, X } from "lucide-react";

import { SignOutButton } from "@/components/brand/sign-out-button";
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
  // Exact match for routes that have child routes handled by their own nav items
  if (href === PORTAL_ROUTES.dashboard || href === PORTAL_ROUTES.account) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalSidebar({
  userName,
  userEmail,
  userRole,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navSections = getPortalNavSections(userRole);

  const sidebarContent = (
    <>
      <div className="border-b border-white/10 px-4 py-4">
        <Link
          href={PORTAL_ROUTES.dashboard}
          onClick={() => setMobileOpen(false)}
          className="text-lg font-semibold tracking-tight text-white transition-colors hover:text-white/90"
        >
          BioEchem
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Portal">
        {navSections.map((section) => (
          <div key={section.title} className="mb-6 last:mb-0">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
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
                          : "text-white/80 hover:bg-white/10 hover:text-white"
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
          </div>
        ))}
      </nav>

      {/* User identity + actions footer — always visible */}
      <div className="border-t border-white/10 px-3 py-3 space-y-1">
        {/* User info */}
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
            {getInitials(userName, userEmail)}
          </div>
          <div className="min-w-0 flex-1">
            {userName ? (
              <p className="truncate text-sm font-medium text-white leading-tight">{userName}</p>
            ) : null}
            {userEmail ? (
              <p className="truncate text-xs text-white/55 leading-tight">{userEmail}</p>
            ) : null}
            {userRole ? (
              <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${ROLE_BADGE[userRole] ?? "bg-white/15 text-white/70"}`}>
                {getRoleLabel(userRole)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 pt-1">
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
    </>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-card-border bg-bio-green-dark px-4 py-3 lg:hidden">
        <Link
          href={PORTAL_ROUTES.dashboard}
          className="text-sm font-semibold text-white"
        >
          BioEchem
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex size-10 items-center justify-center rounded-lg text-white hover:bg-white/10"
          aria-expanded={mobileOpen}
          aria-controls="portal-sidebar"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      <aside
        id="portal-sidebar"
        className={`flex w-full shrink-0 flex-col bg-bio-green-dark lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-r lg:border-bio-green-deep ${
          mobileOpen ? "block" : "hidden lg:flex"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
