"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { ArrowLeft, CalendarDays } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { PhotoManager } from "@/components/admin/content/photo-manager";
import type { PastEventRow } from "@/components/admin/content/past-event-editor";

type Params = { id: string };

export default function AdminEventPhotosPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const [event, setEvent] = useState<PastEventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/content/past-events");
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed to load"); setLoading(false); return; }
    const found = (json.data as PastEventRow[]).find((e) => e.id === id) ?? null;
    setEvent(found);
    if (!found) setError("Event not found.");
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  return (
    <PortalPage title="Event Photos">
      <div className="space-y-4">
        <Link
          href="/admin/content/past-events"
          className="inline-flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ArrowLeft className="h-4 w-4" /> Back to past events
        </Link>

        {loading && <p className="text-sm text-bio-text-muted">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {event && (
          <>
            <PortalCard>
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-bio-green/70" />
                <div>
                  <p className="font-medium text-bio-text">{event.title}</p>
                  <p className="text-xs text-bio-text-muted">
                    {new Date(event.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    {" · "}
                    {event.location}
                  </p>
                </div>
              </div>
            </PortalCard>

            <PortalCard>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">Photos</h2>
              <PhotoManager
                eventId={event.id}
                images={event.event_images}
                onChange={(imgs) => setEvent((e) => e ? { ...e, event_images: imgs } : e)}
              />
            </PortalCard>
          </>
        )}
      </div>
    </PortalPage>
  );
}
