import type { Metadata } from "next";
import { CalendarDays, MapPin } from "lucide-react";

import { requireSession } from "@/lib/auth/session";
import { PortalCard, PortalPage } from "@/components/portal/portal-page";

export const metadata: Metadata = { title: "Events" };

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  link: string | null;
};

function fmt(d: string | null) {
  if (!d) return "Date to be announced";
  return new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default async function PartnerEventsPage() {
  const { supabase, profile } = await requireSession({ requireApproved: true });

  if (profile.role !== "industry_partner" && profile.role !== "bioechem_admin") {
    return (
      <PortalPage title="Events">
        <p className="text-sm text-bio-text-muted">You do not have access to this section.</p>
      </PortalPage>
    );
  }

  const { data } = await supabase
    .from("partner_events")
    .select("id, title, description, event_date, location, link")
    .eq("published", true)
    .order("event_date", { ascending: true, nullsFirst: false })
    .returns<EventRow[]>();

  const events = data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => !e.event_date || e.event_date >= today);
  const past = events.filter((e) => e.event_date && e.event_date < today).reverse();

  function EventCard({ event }: { event: EventRow }) {
    return (
      <PortalCard key={event.id}>
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-bio-green" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-bio-text">{event.title}</p>
            <p className="mt-0.5 text-xs text-bio-text-muted">{fmt(event.event_date)}</p>
            {event.location ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-bio-text-muted">
                <MapPin className="h-3 w-3" /> {event.location}
              </p>
            ) : null}
            {event.description ? (
              <p className="mt-2 text-sm text-bio-text-muted">{event.description}</p>
            ) : null}
            {event.link ? (
              <a
                href={event.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-medium text-bio-green hover:underline"
              >
                Details / RSVP
              </a>
            ) : null}
          </div>
        </div>
      </PortalCard>
    );
  }

  return (
    <PortalPage title="Events" description="Workshops, demos, and outreach events for BioEChem's industry partners.">
      <div className="space-y-8">
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-bio-text-muted">Upcoming</h2>
          {upcoming.length === 0 ? (
            <PortalCard>
              <p className="text-sm text-bio-text-muted">No upcoming events scheduled yet. Check back soon.</p>
            </PortalCard>
          ) : (
            <div className="space-y-3">
              {upcoming.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          )}
        </div>

        {past.length > 0 ? (
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-bio-text-muted">Past events</h2>
            <div className="space-y-3">
              {past.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          </div>
        ) : null}
      </div>
    </PortalPage>
  );
}
