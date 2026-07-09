"use client";

import { useState } from "react";
import { Pin, Users } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  visible_to: string[];
  created_at: string;
  profiles: { full_name: string | null } | null;
};

const ROLE_OPTIONS = [
  { value: "participant", label: "Participants" },
  { value: "teacher", label: "Teachers" },
  { value: "school_admin", label: "School admins" },
  { value: "industry_partner", label: "Industry partners" },
  { value: "shareholder", label: "Shareholders" },
] as const;

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function AudienceBadge({ visibleTo }: { visibleTo: string[] }) {
  if (!visibleTo || visibleTo.length === 0) return null;
  const labels = ROLE_OPTIONS
    .filter((r) => visibleTo.includes(r.value))
    .map((r) => r.label);
  if (labels.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700">
      <Users className="h-3 w-3" />
      {labels.join(", ")} only
    </span>
  );
}

export function AnnouncementsSection({
  cohortId,
  announcements: initial,
  canPost,
}: {
  cohortId: string;
  announcements: Announcement[];
  canPost: boolean;
}) {
  const [announcements, setAnnouncements] = useState(initial);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [visibleTo, setVisibleTo] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function toggleRole(role: string) {
    setVisibleTo((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          is_pinned: pinned,
          visible_to: visibleTo,
        }),
      });
      const json = await res.json() as { data?: Announcement; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to post."); return; }
      if (json.data) setAnnouncements((prev) => [json.data!, ...prev]);
      setTitle("");
      setBody("");
      setPinned(false);
      setVisibleTo([]);
      setShowForm(false);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {canPost ? (
        <div className="rounded-xl border border-card-border bg-card p-4">
          {showForm ? (
            <form onSubmit={(e) => void submit(e)} className="space-y-3">
              <h3 className="text-sm font-semibold text-bio-text">New Announcement</h3>
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text placeholder:text-bio-text-muted focus:outline-none focus:ring-2 focus:ring-bio-green/50"
              />
              <textarea
                placeholder="Write your announcement…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={4}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-bio-text placeholder:text-bio-text-muted focus:outline-none focus:ring-2 focus:ring-bio-green/50"
              />

              {/* Audience selector */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-bio-text-muted">
                  Visible to <span className="font-normal">(leave all unchecked to show everyone)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-card-border px-3 py-1 text-xs transition-colors hover:border-bio-green has-[:checked]:border-bio-green has-[:checked]:bg-bio-green/10 has-[:checked]:text-bio-green">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={visibleTo.includes(opt.value)}
                        onChange={() => toggleRole(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-bio-text-muted">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="accent-bio-green"
                />
                Pin this announcement
              </label>
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-40"
                >
                  {loading ? "Posting…" : "Post"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-sm font-medium text-bio-green hover:underline"
            >
              + Post announcement
            </button>
          )}
        </div>
      ) : null}

      {announcements.length === 0 ? (
        <p className="text-sm text-bio-text-muted">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`rounded-xl border bg-card p-5 ${
                a.is_pinned ? "border-bio-green/30" : "border-card-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-bio-text">{a.title}</h3>
                  <AudienceBadge visibleTo={a.visible_to ?? []} />
                </div>
                {a.is_pinned ? (
                  <Pin className="h-4 w-4 shrink-0 text-bio-green" />
                ) : null}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-bio-text">{a.body}</p>
              <p className="mt-3 text-xs text-bio-text-muted">
                {a.profiles?.full_name ?? "Admin"} · {fmt(a.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
