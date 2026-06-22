"use client";

import { useState } from "react";
import { CalendarDays, MapPin, ExternalLink, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { EventImageCarousel } from "@/components/landing/event-image-carousel";

export type PastEvent = {
  title: string;
  date: string;
  location: string;
  description: string;
  images?: string[];
  highlights?: string[];
  link?: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function PastEventCard({ ev }: { ev: PastEvent }) {
  const [expanded, setExpanded] = useState(false);
  const hasHighlights = ev.highlights && ev.highlights.length > 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-card-border bg-white shadow-[var(--shadow-card)]">
      <EventImageCarousel images={ev.images ?? []} title={ev.title} />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-bio-text-muted">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {fmtDate(ev.date)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {ev.location}
          </span>
        </div>

        <h3 className="mt-2 font-semibold text-bio-text leading-snug">{ev.title}</h3>
        <p className="mt-2 flex-1 text-sm text-bio-text-muted leading-relaxed">
          {ev.description}
        </p>

        <div className="mt-4 flex items-center gap-3">
          {ev.link ? (
            <a
              href={ev.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm font-medium text-bio-green hover:underline"
            >
              View recap <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}

          {hasHighlights ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="ml-auto flex items-center gap-1 text-sm text-bio-text-muted transition-colors hover:text-bio-green"
            >
              {expanded ? "Less" : "Highlights"}
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          ) : null}
        </div>

        {expanded && hasHighlights ? (
          <ul className="mt-3 space-y-1.5 border-t border-card-border pt-3">
            {ev.highlights!.map((h) => (
              <li key={h} className="flex items-start gap-2 text-sm text-bio-text-muted">
                <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bio-green" />
                {h}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function PastEventsGrid({ events }: { events: PastEvent[] }) {
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((ev) => (
        <PastEventCard key={ev.title} ev={ev} />
      ))}
    </div>
  );
}
