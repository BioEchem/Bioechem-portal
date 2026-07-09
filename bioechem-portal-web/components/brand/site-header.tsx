import Image from "next/image";
import Link from "next/link";

import { AuthHeaderLinks } from "@/components/brand/auth-header-links";
import { headerAuthInactive } from "@/components/brand/header-auth-styles";
import { SignOutButton } from "@/components/brand/sign-out-button";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { MAIN_SITE_URL } from "@/lib/brand/site";
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
    profile?.approval_status === "approved"
      ? AUTH_ROUTES.dashboard
      : AUTH_ROUTES.home;

  const homeNavLabel =
    profile?.approval_status === "approved" ? "Dashboard" : "Home";

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
          className="hidden items-center gap-6 text-sm font-medium text-bio-text-muted lg:flex"
          aria-label="Page sections"
        >
          <a href="/" className="transition-colors hover:text-bio-green">Home</a>
          <a
            href={MAIN_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-bio-green"
          >
            BioEchem.com
          </a>
          <span className="h-4 w-px bg-card-border" aria-hidden />
          <a href="/#upcoming-events" className="transition-colors hover:text-bio-green">Upcoming Events</a>
          <a href="/#past-events" className="transition-colors hover:text-bio-green">Past Events</a>
          <a href="/#newsletter" className="transition-colors hover:text-bio-green">Newsletter</a>
          <a href="/#about" className="transition-colors hover:text-bio-green">About</a>
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
