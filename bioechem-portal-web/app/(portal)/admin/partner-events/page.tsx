"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Loader2, Trash2 } from "lucide-react";
import { PortalCard, PortalPage } from "@/components/portal/portal-page";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  link: string | null;
  published: boolean;
};

function fmt(d: string | null) {
  if (!d) return "No date set";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function EventForm({
  initial,
  onSave,
  onCancel,
  onDelete,
  mode,
}: {
  initial?: Partial<EventRow>;
  onSave: (data: Partial<EventRow>) => Promise<EventRow>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  mode: "create" | "edit";
}) {
  const [title,       setTitle]       = useState(initial?.title       ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [eventDate,   setEventDate]   = useState(initial?.event_date  ?? "");
  const [location,    setLocation]    = useState(initial?.location    ?? "");
  const [link,        setLink]        = useState(initial?.link        ?? "");
  const [published,   setPublished]   = useState(initial?.published   ?? true);
  const [status,      setStatus]      = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [confirming,  setConfirming]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(mode === "create" ? "Creating…" : "Saving…");
    try {
      await onSave({
        title,
        description: description || null,
        event_date: eventDate || null,
        location: location || null,
        link: link || null,
        published,
      });
      setStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setStatus(null);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setStatus("Deleting…");
    try { await onDelete(); } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setStatus(null); setConfirming(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Title *</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
            placeholder="Fall Industry Showcase" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Description</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
            placeholder="Brief description of this event…" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Date</label>
          <input type="date" value={eventDate ?? ""} onChange={(e) => setEventDate(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Location</label>
          <input value={location ?? ""} onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
            placeholder="Virtual, or a physical address" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Link <span className="font-normal">(RSVP / details, optional)</span></label>
          <input value={link ?? ""} onChange={(e) => setLink(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
            placeholder="https://…" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 rounded border-card-border accent-bio-green" />
        <span className="text-bio-text">Published (visible to industry partners)</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={!!status}
          className="flex items-center gap-2 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60">
          {status ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {status ?? (mode === "create" ? "Create" : "Save changes")}
        </button>
        <button type="button" onClick={onCancel} disabled={!!status}
          className="rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text disabled:opacity-60">
          Cancel
        </button>
        {onDelete && mode === "edit" && (
          confirming ? (
            <span className="ml-auto flex items-center gap-2">
              <span className="text-xs text-red-600">Delete this event?</span>
              <button type="button" onClick={() => void handleDelete()} disabled={!!status}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60">
                {status === "Deleting…" ? "Deleting…" : "Yes, delete"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="text-xs text-bio-text-muted hover:underline">Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirming(true)}
              className="ml-auto flex items-center gap-1 text-xs text-bio-text-muted hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )
        )}
      </div>
    </form>
  );
}

export default function AdminPartnerEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/partner-events");
    const json = await res.json() as { data?: EventRow[] };
    setEvents(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(data: Partial<EventRow>): Promise<EventRow> {
    const res = await fetch("/api/admin/partner-events", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const json = await res.json() as { data?: EventRow; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Failed to create");
    setEvents((prev) => [json.data!, ...prev]);
    setCreating(false);
    return json.data!;
  }

  async function handleUpdate(id: string, data: Partial<EventRow>): Promise<EventRow> {
    const res = await fetch(`/api/admin/partner-events/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const json = await res.json() as { data?: EventRow; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Failed to update");
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...json.data } : e)));
    setExpandedId(null);
    return json.data!;
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/partner-events/${id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? "Delete failed"); }
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  async function togglePublish(event: EventRow) {
    const res = await fetch(`/api/admin/partner-events/${event.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !event.published }),
    });
    const json = await res.json() as { data?: EventRow };
    if (json.data) setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, published: json.data!.published } : e)));
  }

  return (
    <PortalPage title="Partner Events" description="Manage workshops, demos, and outreach events for industry partners.">
      <div className="space-y-4">
        <div className="flex justify-end">
          {!creating && (
            <button onClick={() => setCreating(true)}
              className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90">
              + Add event
            </button>
          )}
        </div>

        {creating && (
          <PortalCard>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">New event</h2>
            <EventForm mode="create" onSave={handleCreate} onCancel={() => setCreating(false)} />
          </PortalCard>
        )}

        {loading && <p className="text-sm text-bio-text-muted">Loading…</p>}

        {!loading && events.length === 0 && !creating && (
          <PortalCard>
            <div className="flex flex-col items-center py-10 text-center">
              <CalendarDays className="mb-3 h-8 w-8 text-bio-text-muted" />
              <p className="text-sm text-bio-text-muted">No events yet. Click <strong>+ Add event</strong> to create one.</p>
            </div>
          </PortalCard>
        )}

        {events.map((event) => (
          <PortalCard key={event.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-bio-text">{event.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${event.published ? "bg-bio-green/10 text-bio-green" : "bg-amber-100 text-amber-700"}`}>
                    {event.published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-bio-text-muted">
                  {fmt(event.event_date)}{event.location ? ` · ${event.location}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button onClick={() => void togglePublish(event)}
                  className={`text-xs font-medium ${event.published ? "text-amber-600 hover:text-amber-700" : "text-bio-green hover:text-bio-green/80"}`}>
                  {event.published ? "Unpublish" : "Publish"}
                </button>
                <button onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                  className="text-bio-text-muted hover:text-bio-green">
                  {expandedId === event.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {expandedId === event.id && (
              <div className="mt-4 border-t border-card-border pt-4">
                <EventForm
                  mode="edit"
                  initial={event}
                  onSave={(data) => handleUpdate(event.id, data)}
                  onCancel={() => setExpandedId(null)}
                  onDelete={() => handleDelete(event.id)}
                />
              </div>
            )}
          </PortalCard>
        ))}
      </div>
    </PortalPage>
  );
}
