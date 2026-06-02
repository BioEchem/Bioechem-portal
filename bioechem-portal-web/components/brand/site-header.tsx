import Image from "next/image";
import Link from "next/link";

import { AuthHeaderLinks } from "@/components/brand/auth-header-links";
import { headerAuthInactive } from "@/components/brand/header-auth-styles";
import { SignOutButton } from "@/components/brand/sign-out-button";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { MAIN_SITE_NAV, PORTAL_NAV } from "@/lib/brand/site";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role, approval_status")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const homeHref =
    profile?.approval_status === "approved" && profile.role === "bioechem_admin"
      ? AUTH_ROUTES.adminApprovals
      : profile?.approval_status === "approved" && profile.role === "school_admin"
        ? AUTH_ROUTES.schoolHub
        : AUTH_ROUTES.dashboard;

  const homeNavLabel =
    profile?.approval_status === "approved" && profile.role === "bioechem_admin"
      ? "Admin"
      : profile?.approval_status === "approved" && profile.role === "school_admin"
        ? "School"
        : "Dashboard";

  return (
    <header className="sticky top-0 z-50 border-b border-card-border bg-card shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href={homeHref}
          className="flex shrink-0 items-center gap-3"
          title={`Go to your ${homeNavLabel.toLowerCase()}`}
        >
          <Image
            src="/bioechem_llc_logo.jpeg"
            alt="BioEchem — dashboard"
            width={48}
            height={48}
            className="rounded-full"
            priority
          />
        </Link>

        <nav
          className="hidden items-center gap-6 text-sm font-medium text-bio-text lg:flex"
          aria-label="Portal and BioEchem website"
        >
          {PORTAL_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-bio-green"
            >
              {item.label}
            </Link>
          ))}
          <span className="h-4 w-px bg-card-border" aria-hidden />
          {MAIN_SITE_NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-bio-green"
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.label}
              <span className="sr-only"> (opens bioechem.com)</span>
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <span
                className="hidden max-w-[10rem] truncate text-sm text-bio-text-muted sm:inline"
                title={user.email ?? undefined}
              >
                {user.email}
              </span>
              <Link
                href={homeHref}
                className={`hidden sm:inline ${headerAuthInactive}`}
              >
                {homeNavLabel}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <AuthHeaderLinks />
          )}
        </div>
      </div>
    </header>
  );
}
