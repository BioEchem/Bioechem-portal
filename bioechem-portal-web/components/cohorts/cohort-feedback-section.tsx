"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { PortalCard } from "@/components/portal/portal-page";
import { formatShortDate as fmt } from "@/lib/format/date";

type Feedback = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at?: string;
};

type FeedbackWithProfile = Feedback & {
  user_id?: string;
  profiles?: { full_name: string | null; email: string | null } | null;
};

function StarPicker({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          aria-label={`Rate ${n} out of 5`}
          className="disabled:opacity-60"
        >
          <Star
            className={`h-6 w-6 ${n <= value ? "fill-bio-green text-bio-green" : "text-card-border"}`}
          />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-4 w-4 ${n <= value ? "fill-bio-green text-bio-green" : "text-card-border"}`} />
      ))}
    </div>
  );
}

/** Participant's own rating + comment for this cohort. Can be submitted/updated any time. */
export function CohortFeedbackSelfSection({ cohortId }: { cohortId: string }) {
  const [entry, setEntry] = useState<Feedback | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/cohorts/${cohortId}/feedback`);
    const json = await res.json() as { data?: Feedback | null };
    setEntry(json.data ?? null);
    setRating(json.data?.rating ?? 0);
    setComment(json.data?.comment ?? "");
    setEditing(!json.data);
    setLoading(false);
  }, [cohortId]);

  useEffect(() => { void load(); }, [load]);

  async function handleSave() {
    if (rating < 1) {
      setError("Pick a rating from 1 to 5 first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const json = await res.json() as { data?: Feedback; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save.");
      setEntry(json.data ?? null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit() {
    setError(null);
    setRating(entry?.rating ?? 0);
    setComment(entry?.comment ?? "");
    setEditing(true);
  }

  function handleCancel() {
    setError(null);
    setRating(entry?.rating ?? 0);
    setComment(entry?.comment ?? "");
    setEditing(false);
  }

  if (loading) return <p className="text-sm text-bio-text-muted">Loading…</p>;

  if (!editing && entry) {
    return (
      <PortalCard>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">Cohort feedback</h2>
        <div className="mt-3">
          <StarDisplay value={entry.rating} />
        </div>
        {entry.comment ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-bio-text-muted">{entry.comment}</p>
        ) : (
          <p className="mt-2 text-sm italic text-bio-text-muted/60">No comment left.</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleEdit}
            className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-bio-text-muted hover:border-bio-green hover:text-bio-green"
          >
            Update feedback
          </button>
          {entry.updated_at && (
            <span className="text-xs text-bio-text-muted">Last updated {fmt(entry.updated_at)}</span>
          )}
        </div>
      </PortalCard>
    );
  }

  return (
    <PortalCard>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">Cohort feedback</h2>
      <p className="mt-1 text-sm text-bio-text-muted">
        Rate this cohort and leave a comment for BioEchem. You can update this any time while the cohort is running.
      </p>

      <div className="mt-3">
        <StarPicker value={rating} onChange={setRating} disabled={saving} />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={saving}
        rows={4}
        placeholder="What worked well? What could be better?"
        className="mt-3 w-full resize-y rounded-lg border border-card-border bg-white px-3 py-2.5 text-sm text-bio-text focus:border-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/25"
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : entry ? "Save changes" : "Submit feedback"}
        </button>
        {entry && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="rounded-lg border border-card-border px-3 py-2 text-sm text-bio-text-muted hover:border-bio-green hover:text-bio-green disabled:opacity-60"
          >
            Cancel
          </button>
        )}
      </div>
    </PortalCard>
  );
}

/** Teacher/admin view of cohort feedback. Teachers see anonymized rows; admins see who submitted each. */
export function CohortFeedbackManagerSection({ cohortId }: { cohortId: string }) {
  const [entries, setEntries] = useState<FeedbackWithProfile[]>([]);
  const [anonymized, setAnonymized] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/cohorts/${cohortId}/feedback?all=1`);
      const json = await res.json() as { data?: FeedbackWithProfile[]; anonymized?: boolean };
      setEntries(json.data ?? []);
      setAnonymized(json.anonymized ?? true);
      setLoading(false);
    })();
  }, [cohortId]);

  if (loading) return <p className="text-sm text-bio-text-muted">Loading…</p>;

  if (entries.length === 0) {
    return (
      <PortalCard>
        <p className="text-sm text-bio-text-muted">No feedback has been submitted for this cohort yet.</p>
      </PortalCard>
    );
  }

  const average = entries.reduce((sum, e) => sum + e.rating, 0) / entries.length;

  return (
    <div className="space-y-3">
      <PortalCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-bio-text">
            Average rating: {average.toFixed(1)} / 5 ({entries.length} response{entries.length === 1 ? "" : "s"})
          </span>
          {anonymized && (
            <span className="text-xs text-bio-text-muted">Responses are anonymized to teachers.</span>
          )}
        </div>
      </PortalCard>

      {entries.map((entry) => (
        <PortalCard key={entry.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {anonymized ? (
              <StarDisplay value={entry.rating} />
            ) : (
              <span className="font-medium text-bio-text">
                {entry.profiles?.full_name ?? entry.profiles?.email ?? "Unknown participant"}
              </span>
            )}
            <span className="text-xs text-bio-text-muted">{fmt(entry.created_at)}</span>
          </div>
          {!anonymized && (
            <div className="mt-1">
              <StarDisplay value={entry.rating} />
            </div>
          )}
          {entry.comment ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-bio-text-muted">{entry.comment}</p>
          ) : (
            <p className="mt-2 text-sm italic text-bio-text-muted/60">No comment left.</p>
          )}
        </PortalCard>
      ))}
    </div>
  );
}
