"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, FileText, FileVideo, Users } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import {
  DeleteButton,
  NewsletterEditor,
  type NewsletterRow,
} from "@/components/admin/content/newsletter-editor";

export default function AdminNewslettersPage() {
  const [rows, setRows] = useState<NewsletterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/content/newsletters");
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed to load"); setLoading(false); return; }
    setRows(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(data: Partial<NewsletterRow>): Promise<NewsletterRow> {
    const res = await fetch("/api/admin/content/newsletters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to create");
    const created = json.data as NewsletterRow;
    setRows((r) => [created, ...r]);
    setCreating(false);
    return created;
  }

  async function handleUpdate(id: string, data: Partial<NewsletterRow>): Promise<NewsletterRow> {
    const res = await fetch(`/api/admin/content/newsletters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to update");
    const updated = json.data as NewsletterRow;
    setRows((r) => r.map((row) => (row.id === id ? updated : row)));
    setExpandedId(null);
    return updated;
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/content/newsletters/${id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Delete failed"); }
    setRows((r) => r.filter((row) => row.id !== id));
  }

  async function togglePublish(row: NewsletterRow) {
    const res = await fetch(`/api/admin/content/newsletters/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !row.published }),
    });
    const json = await res.json();
    if (!res.ok) return;
    setRows((r) => r.map((nr) => (nr.id === row.id ? (json.data as NewsletterRow) : nr)));
  }

  return (
    <PortalPage
      title="Newsletters"
      description="Newsletters appear in the newsletter section on the public landing page."
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
              + Add newsletter
            </button>
          )}
        </div>

        {creating && (
          <PortalCard>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">New newsletter</h2>
            <NewsletterEditor
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
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-bio-green/70" />
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
                    {row.visible_to?.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                        <Users className="h-3 w-3" /> Restricted
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-bio-text-muted">
                    {new Date(row.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    {row.pdf_url && (
                      <a
                        href={row.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center gap-1 text-bio-green hover:underline"
                      >
                        <FileText className="h-3 w-3" /> PDF
                      </a>
                    )}
                    {row.video_url && (
                      <a
                        href={row.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center gap-1 text-blue-500 hover:underline"
                      >
                        <FileVideo className="h-3 w-3" /> Video
                      </a>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => togglePublish(row)}
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
                <NewsletterEditor
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
            <p className="text-sm text-bio-text-muted">No newsletters yet. Click <strong>+ Add newsletter</strong> to create one.</p>
          </PortalCard>
        )}
      </div>
    </PortalPage>
  );
}
