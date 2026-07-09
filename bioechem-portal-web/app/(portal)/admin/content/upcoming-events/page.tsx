"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { DeleteButton } from "@/components/admin/content/newsletter-editor";
import { UpcomingEventEditor, type UpcomingEventRow } from "@/components/admin/content/upcoming-event-editor";

export default function AdminUpcomingEventsPage() {
  const [rows, setRows] = useState<UpcomingEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/content/upcoming-events");
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed to load"); setLoading(false); return; }
    setRows(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(data: Partial<UpcomingEventRow>): Promise<UpcomingEventRow> {
    const res = await fetch("/api/admin/content/upcoming-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to create");
    const created: UpcomingEventRow = json.data as UpcomingEventRow;
    setRows((r) => [created, ...r]);
    setCreating(false);
    return created;
  }

  async function handleUpdate(id: string, data: Partial<UpcomingEventRow>): Promise<UpcomingEventRow> {
    const res = await fetch(`/api/admin/content/upcoming-events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to update");
    const updated: UpcomingEventRow = json.data as UpcomingEventRow;
    setRows((r) => r.map((row) => (row.id === id ? updated : row)));
    setExpandedId(null);
    return updated;
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/content/upcoming-events/${id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Delete failed"); }
    setRows((r) => r.filter((row) => row.id !== id));
  }

  async function togglePublish(row: UpcomingEventRow) {
    const res = await fetch(`/api/admin/content/upcoming-events/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !row.published }),
    });
    const json = await res.json();
    if (!res.ok) return;
    setRows((r) => r.map((nr) => (nr.id === row.id ? (json.data as UpcomingEventRow) : nr)));
  }

  return (
    <PortalPage
      title="Upcoming Events"
      description="Published upcoming events appear in the events section of the public landing page."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/admin/content"
            className="inline-flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Website Content
          </Link>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90"
            >
              + Add event
            </button>
          )}
        </div>

        {creating && (
          <PortalCard>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">New upcoming event</h2>
            <UpcomingEventEditor
              mode="create"
              onSave={handleCreate}
              onCancel={() => setCreating(false)}
            />
          </PortalCard>
        )}

        {loading && <p className="text-sm text-bio-text-muted">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {rows.map((row) => (
          <PortalCard key={row.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-bio-green/70" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-bio-text">{row.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.published
                          ? "bg-bio-green/10 text-bio-green"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {row.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-bio-text-muted">
                    {new Date(row.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    {" · "}
                    {row.location}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => void togglePublish(row)}
                  className={`text-xs font-medium ${
                    row.published ? "text-amber-600 hover:text-amber-700" : "text-bio-green hover:text-bio-green/80"
                  }`}
                >
                  {row.published ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                  className="text-bio-text-muted hover:text-bio-green"
                >
                  {expandedId === row.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {expandedId === row.id && (
              <div className="mt-4 border-t border-card-border pt-4">
                <UpcomingEventEditor
                  mode="edit"
                  initial={row}
                  onSave={(data) => handleUpdate(row.id, data)}
                  onCancel={() => setExpandedId(null)}
                />
                <div className="mt-4 border-t border-card-border pt-3">
                  <DeleteButton label={`"${row.title}"`} onDelete={() => handleDelete(row.id)} />
                </div>
              </div>
            )}
          </PortalCard>
        ))}

        {!loading && !creating && rows.length === 0 && (
          <PortalCard>
            <p className="text-sm text-bio-text-muted">
              No upcoming events yet. Click <strong>+ Add event</strong> to create one.
            </p>
          </PortalCard>
        )}
      </div>
    </PortalPage>
  );
}
