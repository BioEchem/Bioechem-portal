"use client";

import { useMemo, useState } from "react";
import { formatShortDate as fmt } from "@/lib/format/date";
import { getRoleLabel } from "@/lib/profile/display";

type UserRow = {
  userId: string;
  name: string;
  email: string;
  role: string;
  note: string | null;
  updatedAt: string | null;
};

type HistoryEntry = {
  id: string;
  note: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

function CreditsRow({ user }: { user: UserRow }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(user.note ?? "");
  const [current, setCurrent] = useState({ note: user.note, updatedAt: user.updatedAt });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/credits/${user.userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const json = await res.json() as { data?: { note: string | null; created_at: string }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save.");
      setCurrent({ note: json.data?.note ?? null, updatedAt: json.data?.created_at ?? null });
      setEditing(false);
      setHistory(null); // stale — refetch next time history is opened
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleHistory() {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setShowHistory(true);
    if (history) return; // already loaded
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/admin/credits/${user.userId}`);
      const json = await res.json() as { data?: HistoryEntry[] };
      setHistory(json.data ?? []);
    } finally {
      setLoadingHistory(false);
    }
  }

  return (
    <>
      <tr className="border-b border-card-border/70 align-top last:border-0">
        <td className="py-3 pr-4">
          <p className="text-sm font-medium text-bio-text">{user.name}</p>
          <p className="text-xs text-bio-text-muted">{user.email}</p>
          <p className="text-xs text-bio-text-muted">{getRoleLabel(user.role)}</p>
        </td>
        <td className="py-3 pr-4">
          {editing ? (
            <div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={saving}
                rows={2}
                placeholder="e.g. 5 credits — updated career path Aug 2026"
                className="w-full min-w-[16rem] resize-y rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/25"
              />
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="rounded-lg bg-bio-green px-3 py-1.5 text-xs font-medium text-white hover:bg-bio-green/90 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save as new entry"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setNote(current.note ?? ""); setError(null); }}
                  disabled={saving}
                  className="rounded-lg border border-card-border px-3 py-1.5 text-xs text-bio-text-muted hover:border-bio-green hover:text-bio-green disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : current.note ? (
            <p className="whitespace-pre-wrap text-sm text-bio-text">{current.note}</p>
          ) : (
            <p className="text-sm italic text-bio-text-muted/60">No credits recorded.</p>
          )}
        </td>
        <td className="py-3 pr-4 text-xs text-bio-text-muted">
          {current.updatedAt ? fmt(current.updatedAt) : "—"}
        </td>
        <td className="py-3">
          {!editing && (
            <div className="flex flex-col items-start gap-1.5">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-bio-text-muted hover:border-bio-green hover:text-bio-green"
              >
                {current.note ? "Add new entry" : "Add"}
              </button>
              <button
                type="button"
                onClick={() => void toggleHistory()}
                className="text-xs text-bio-text-muted hover:text-bio-green hover:underline"
              >
                {showHistory ? "Hide history" : "View history"}
              </button>
            </div>
          )}
        </td>
      </tr>
      {showHistory && (
        <tr className="border-b border-card-border/70 last:border-0">
          <td colSpan={4} className="bg-bio-bg px-3 py-3">
            {loadingHistory ? (
              <p className="text-xs text-bio-text-muted">Loading history…</p>
            ) : !history || history.length === 0 ? (
              <p className="text-xs text-bio-text-muted">No history yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((entry) => (
                  <li key={entry.id} className="border-b border-card-border/50 pb-2 text-xs last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-bio-text-muted">
                      <span>{fmt(entry.created_at)}</span>
                      <span>{entry.profiles?.full_name ?? entry.profiles?.email ?? "Admin"}</span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-bio-text">
                      {entry.note ?? <span className="italic text-bio-text-muted/60">(cleared)</span>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function CreditsAdmin({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text placeholder:text-bio-text-muted/60 focus:border-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/20"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-xs font-semibold uppercase tracking-wide text-bio-text-muted">
              <th className="pb-2 pr-4">User</th>
              <th className="pb-2 pr-4">Credits note</th>
              <th className="pb-2 pr-4">Last updated</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-bio-text-muted">
                  No users match your search.
                </td>
              </tr>
            ) : (
              filtered.map((user) => <CreditsRow key={user.userId} user={user} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
