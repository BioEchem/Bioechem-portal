import Link from "next/link";
import { CalendarDays, MapPin, Mail, ExternalLink } from "lucide-react";

import { SiteFooter } from "@/components/brand/site-footer";
import { SiteHeader } from "@/components/brand/site-header";
import { NewsletterList } from "@/components/landing/newsletter-list";
import { PastEventsGrid } from "@/components/landing/past-events-grid";
import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { ABOUT, EVENTS, HERO, STATS } from "@/lib/brand/landing-content";
import type { NewsletterEntry } from "@/components/landing/newsletter-list";
import type { PastEvent } from "@/components/landing/past-events-grid";
import { MAIN_SITE_URL } from "@/lib/brand/site";
import { createClient } from "@/lib/supabase/server";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedInDestination = user
    ? await resolvePostLoginRedirect(supabase, user.id)
    : null;

  const [{ data: dbNewsletters }, { data: dbEvents }] = await Promise.all([
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

  return (
    <>
      <SiteHeader />
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
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              {user && signedInDestination ? (
                <Link href={signedInDestination} className="bio-btn-primary">
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Link href={AUTH_ROUTES.signup} className="bio-btn-primary">
                    Create account
                  </Link>
                  <Link
                    href={AUTH_ROUTES.login}
                    className="inline-flex h-11 items-center justify-center rounded-lg border-2 border-white/70 px-6 text-sm font-medium text-white transition-colors hover:border-white hover:bg-white/10"
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
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
        <section id="events" className="bio-pattern px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-xl font-semibold text-bio-green">Upcoming Events</h2>
            <p className="mt-1 text-sm text-bio-text-muted">
              Workshops, webinars, and school orientations
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {EVENTS.map((ev) => (
                <div
                  key={ev.title}
                  className="flex flex-col rounded-xl border border-card-border bg-white p-5 shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-bio-green-light">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    {fmtDate(ev.date)}
                  </div>
                  <h3 className="mt-2 font-semibold text-bio-text leading-snug">
                    {ev.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-1 text-xs text-bio-text-muted">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {ev.location}
                  </div>
                  <p className="mt-3 flex-1 text-sm text-bio-text-muted leading-relaxed">
                    {ev.description}
                  </p>
                  {ev.link ? (
                    <a
                      href={ev.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex items-center gap-1 text-sm font-medium text-bio-green hover:underline"
                    >
                      Learn more <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Past Events ── */}
        {pastEvents.length > 0 ? (
          <section id="past-events" className="bg-white px-4 py-14 sm:px-6">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-xl font-semibold text-bio-green">Past Events</h2>
              <p className="mt-1 text-sm text-bio-text-muted">
                Photos and highlights from previous programs
              </p>
              <PastEventsGrid events={pastEvents} />
            </div>
          </section>
        ) : null}

        {/* ── Newsletters ── */}
        {newsletters.length > 0 ? (
          <section id="newsletter" className="bg-white px-4 py-14 sm:px-6 border-t border-card-border">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-xl font-semibold text-bio-green">Newsletter</h2>
              <p className="mt-1 text-sm text-bio-text-muted">
                Updates from the BioEchem team
              </p>
              <NewsletterList newsletters={newsletters} />
            </div>
          </section>
        ) : null}

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

        {/* ── Bottom CTA ── */}
        {!user ? (
          <section id="join" className="bg-white px-4 py-14 sm:px-6">
            <div className="mx-auto max-w-xl text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-bio-mint">
                <Mail className="h-5 w-5 text-bio-green" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-bio-text">
                Join the portal
              </h2>
              <p className="mt-2 text-sm text-bio-text-muted">
                Partner-school teachers and students can create an account and get
                access after admin approval.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href={AUTH_ROUTES.signup} className="bio-btn-primary">
                  Create account
                </Link>
                <Link href={AUTH_ROUTES.login} className="bio-btn-secondary">
                  Log in
                </Link>
              </div>
            </div>
          </section>
        ) : null}

      </main>
      <SiteFooter />
    </>
  );
}
