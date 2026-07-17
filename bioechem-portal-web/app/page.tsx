import Link from "next/link";
import { Mail, ExternalLink, Handshake } from "lucide-react";

import { SiteFooter } from "@/components/brand/site-footer";
import { SiteHeader } from "@/components/brand/site-header";
import { LandingSectionNav } from "@/components/landing/section-nav";
import { NewsletterList } from "@/components/landing/newsletter-list";
import { RoleGuide } from "@/components/landing/role-guide";
import { PastEventsGrid } from "@/components/landing/past-events-grid";
import { UpcomingEventsList } from "@/components/landing/upcoming-events-list";
import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { ABOUT, HERO, STATS } from "@/lib/brand/landing-content";
import type { NewsletterEntry } from "@/components/landing/newsletter-list";
import type { PastEvent } from "@/components/landing/past-events-grid";
import type { UpcomingEvent } from "@/components/landing/upcoming-events-list";
import { MAIN_SITE_URL } from "@/lib/brand/site";
import { createClient } from "@/lib/supabase/server";


const GMAIL_LINK = "https://mail.google.com/mail/?view=cm&to=team@bioechem.com";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedInDestination = user
    ? await resolvePostLoginRedirect(supabase, user.id)
    : null;

  const [{ data: dbNewsletters }, { data: dbEvents }, { data: dbUpcoming }] = await Promise.all([
    supabase
      .from("newsletters")
      .select("id, title, date, excerpt, pdf_url, body, published")
      .eq("published", true)
      .order("date", { ascending: false }),
    supabase
      .from("past_events")
      .select("id, title, date, location, description, highlights, link, published, event_images(id, url, filename, position)")
      .eq("published", true)
      .order("date", { ascending: false }),
    supabase
      .from("upcoming_events")
      .select("id, title, date, location, description, link")
      .eq("published", true)
      .order("date", { ascending: true }),
  ]);

  const newsletters: NewsletterEntry[] = (dbNewsletters ?? []).map((n) => ({
    title: n.title,
    date: n.date,
    excerpt: n.excerpt,
    link: n.pdf_url ?? undefined,
    body: n.body ?? undefined,
  }));

  const pastEvents: PastEvent[] = (dbEvents ?? []).map((e) => {
    const images = (e.event_images as { id: string; url: string; filename: string; position: number }[])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((img) => img.url);
    return {
      title: e.title,
      date: e.date,
      location: e.location,
      description: e.description,
      highlights: e.highlights ?? [],
      link: e.link ?? undefined,
      images,
    };
  });

  const upcomingEvents: UpcomingEvent[] = (dbUpcoming ?? []).map((e) => ({
    title: e.title,
    date: e.date,
    location: e.location,
    description: e.description,
    link: e.link ?? undefined,
  }));

  return (
    <>
      <SiteHeader />
      <LandingSectionNav />
      <main className="flex flex-1 flex-col">

        {/* ── Hero ── */}
        <section className="bio-gradient-header px-4 py-20 text-white sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-bio-green-muted">
              {HERO.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">
              {HERO.headline}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-white/85 sm:text-lg">
              {HERO.subheadline}
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {user && signedInDestination ? (
                <Link
                  href={signedInDestination}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-6 text-sm font-semibold text-bio-green-deep shadow-lg transition-colors hover:bg-bio-mint"
                >
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href={AUTH_ROUTES.signup}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-6 text-sm font-semibold text-bio-green-deep shadow-lg transition-colors hover:bg-bio-mint"
                  >
                    Create account
                  </Link>
                  <Link
                    href={AUTH_ROUTES.login}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-6 text-sm font-semibold text-bio-green-deep shadow-lg transition-colors hover:bg-bio-mint"
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Who is this for? — helps first-time visitors pick a role ── */}
        {!user && <RoleGuide />}

        {/* ── Collaboration CTA — one place, impossible to miss ── */}
        <section className="bg-green-50 px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-4xl flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left sm:gap-10">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-bio-green/15">
              <Handshake className="h-7 w-7 text-bio-green" />
            </div>
            <div className="flex-1">
              <p className="text-xl font-semibold text-gray-900">
                We&apos;re open for collaborations, partners &amp; ideas
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Schools, industry partners, researchers — reach out and let&apos;s build something together.
                Email us directly at{" "}
                <a
                  href={GMAIL_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-bio-green underline underline-offset-2 hover:text-bio-green/80"
                >
                  team@bioechem.com
                </a>
              </p>
            </div>
            <a
              href={GMAIL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-bio-green px-6 py-3 text-sm font-semibold text-white hover:bg-bio-green/90 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Get in touch
            </a>
          </div>
        </section>

        {/* ── Stats bar ── */}
        <section className="border-b border-card-border bg-white">
          <div className="mx-auto grid max-w-4xl grid-cols-2 divide-x divide-card-border sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="px-6 py-8 text-center">
                <p className="text-3xl font-bold text-bio-green">{s.value}</p>
                <p className="mt-1 text-sm text-bio-text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Upcoming Events ── */}
        <section id="upcoming-events" className="bg-white px-4 py-14 sm:px-6 border-t border-card-border">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-xl font-semibold text-bio-green">Upcoming Events</h2>
            <p className="mt-1 text-sm text-bio-text-muted">
              What&apos;s coming up at BioEchem
            </p>
            <UpcomingEventsList events={upcomingEvents} />
          </div>
        </section>

        {/* ── Past Events ── */}
        <section id="past-events" className="bg-white px-4 py-14 sm:px-6 border-t border-card-border">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-xl font-semibold text-bio-green">Past Events</h2>
            <p className="mt-1 text-sm text-bio-text-muted">
              Photos and highlights from previous programs
            </p>
            {pastEvents.length > 0 ? (
              <PastEventsGrid events={pastEvents} />
            ) : (
              <p className="mt-6 text-sm text-bio-text-muted">No past events yet — check back soon!</p>
            )}
          </div>
        </section>

        {/* ── Newsletters ── */}
        <section id="newsletter" className="bg-white px-4 py-14 sm:px-6 border-t border-card-border">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-xl font-semibold text-bio-green">Newsletter</h2>
            <p className="mt-1 text-sm text-bio-text-muted">
              Updates from the BioEchem team
            </p>
            {newsletters.length > 0 ? (
              <NewsletterList newsletters={newsletters} />
            ) : (
              <p className="mt-6 text-sm text-bio-text-muted">No newsletters yet — check back soon!</p>
            )}
          </div>
        </section>

        {/* ── About / Mission ── */}
        <section id="about" className="bio-gradient-soft px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-xl font-semibold text-bio-green">{ABOUT.heading}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-bio-text-muted leading-relaxed">
              {ABOUT.body}
            </p>
            <a
              href={MAIN_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-bio-green hover:underline"
            >
              {ABOUT.linkLabel} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>

      </main>
      <SiteFooter />
    </>
  );
}
