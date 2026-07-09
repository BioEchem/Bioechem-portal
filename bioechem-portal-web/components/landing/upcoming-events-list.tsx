"use client";

import { CalendarDays, MapPin, ExternalLink } from "lucide-react";

export type UpcomingEvent = {
  title: string;
  date: string;
  location: string;
  description: string;
  link?: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function UpcomingEventCard({ ev }: { ev: UpcomingEvent }) {
  return (
    <div className="flex flex-col rounded-xl border border-card-border bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-3 text-xs text-bio-text-muted">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5 text-bio-green" />
          {fmtDate(ev.date)}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-bio-green" />
          {ev.location}
        </span>
      </div>
      <h3 className="mt-2 font-semibold text-bio-text leading-snug">{ev.title}</h3>
      <p className="mt-2 flex-1 text-sm text-bio-text-muted leading-relaxed">{ev.description}</p>
      {ev.link ? (
        <a
          href={ev.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-bio-green hover:underline"
        >
          Register / Learn more <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </div>
  );
}

export function UpcomingEventsList({ events }: { events: UpcomingEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="mt-6 text-sm text-bio-text-muted">
        No upcoming events scheduled right now — check back soon!
      </p>
    );
  }
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((ev) => (
        <UpcomingEventCard key={ev.title + ev.date} ev={ev} />
      ))}
    </div>
  );
}
