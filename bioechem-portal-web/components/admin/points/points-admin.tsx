"use client";

import { useState } from "react";
import { Award, ChevronDown, ChevronUp, Loader2, Trash2 } from "lucide-react";

type LeaderboardUser = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  total_points: number;
};

type Transaction = {
  id: string;
  source: string;
  cohort_id: string | null;
  points: number;
  note: string | null;
  created_at: string;
  cohorts: { name: string } | null;
};

export function PointsAdmin({ users }: { users: LeaderboardUser[] }) {
  const [list, setList] = useState(users);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, Transaction[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);

  // Award form state
  const [awardUserId, setAwardUserId] = useState("");
  const [awardPoints, setAwardPoints] = useState("");
  const [awardNote, setAwardNote] = useState("");
  const [awarding, setAwarding] = useState(false);
  const [awardError, setAwardError] = useState<string | null>(null);

  async function toggleExpand(userId: string) {
    if (expanded === userId) {
      setExpanded(null);
      return;
    }
    setExpanded(userId);
    if (!history[userId]) {
      setLoadingHistory(userId);
      const res = await fetch(`/api/admin/points/${userId}`);
      const json = await res.json();
      setHistory((h) => ({ ...h, [userId]: json.data ?? [] }));
      setLoadingHistory(null);
    }
  }

  async function deleteTransaction(userId: string, txId: string) {
    await fetch(`/api/admin/points/${userId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction_id: txId }),
    });
    setHistory((h) => ({
      ...h,
      [userId]: (h[userId] ?? []).filter((t) => t.id !== txId),
    }));
    const deleted = history[userId]?.find((t) => t.id === txId);
    if (deleted) {
      setList((l) =>
        l.map((u) =>
          u.user_id === userId
            ? { ...u, total_points: u.total_points - deleted.points }
            : u
        ).sort((a, b) => b.total_points - a.total_points)
      );
    }
  }

  async function handleAward(e: React.FormEvent) {
    e.preventDefault();
    setAwardError(null);
    const pts = parseInt(awardPoints, 10);
    if (!awardUserId || isNaN(pts) || pts === 0) {
      setAwardError("Select a user and enter a non-zero point value.");
      return;
    }
    setAwarding(true);
    const res = await fetch("/api/admin/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: awardUserId, points: pts, note: awardNote || null }),
    });
    const json = await res.json();
    setAwarding(false);
    if (!res.ok) {
      setAwardError(json.error ?? "Failed to award points");
      return;
    }
    setList((l) =>
      l.map((u) =>
        u.user_id === awardUserId
          ? { ...u, total_points: u.total_points + pts }
          : u
      ).sort((a, b) => b.total_points - a.total_points)
    );
    // Append to expanded history if open
    if (expanded === awardUserId && history[awardUserId]) {
      setHistory((h) => ({
        ...h,
        [awardUserId]: [json.data, ...(h[awardUserId] ?? [])],
      }));
    }
    setAwardPoints("");
    setAwardNote("");
  }

  return (
    <div className="space-y-6">
      {/* Manual award form */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" /> Manual Award / Deduction
        </h2>
        <form onSubmit={handleAward} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select
            value={awardUserId}
            onChange={(e) => setAwardUserId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:col-span-2"
          >
            <option value="">Select user…</option>
            {list.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Points (negative to deduct)"
            value={awardPoints}
            onChange={(e) => setAwardPoints(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Note (optional)"
            value={awardNote}
            onChange={(e) => setAwardNote(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="sm:col-span-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={awarding}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {awarding && <Loader2 className="w-4 h-4 animate-spin" />}
              Award Points
            </button>
            {awardError && <p className="text-sm text-red-600">{awardError}</p>}
          </div>
        </form>
      </div>

      {/* Leaderboard */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Leaderboard</h2>
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No point transactions yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {list.map((u, idx) => (
              <div key={u.user_id}>
                <button
                  onClick={() => toggleExpand(u.user_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                >
                  <span className="text-sm font-bold text-gray-400 w-6 text-right shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email} · {u.role}</p>
                  </div>
                  <span className="text-sm font-bold text-amber-600 shrink-0">
                    {u.total_points.toLocaleString()} pts
                  </span>
                  {expanded === u.user_id
                    ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>

                {expanded === u.user_id && (
                  <div className="bg-gray-50 px-4 pb-3">
                    {loadingHistory === u.user_id ? (
                      <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
                      </div>
                    ) : (history[u.user_id] ?? []).length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">No transactions.</p>
                    ) : (
                      <div className="space-y-1 mt-1">
                        {(history[u.user_id] ?? []).map((tx) => (
                          <div key={tx.id} className="flex items-center gap-2 text-xs">
                            <span className={`font-bold shrink-0 ${tx.points >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {tx.points >= 0 ? "+" : ""}{tx.points}
                            </span>
                            <span className="flex-1 text-gray-600 truncate">
                              {tx.note ?? tx.source}
                              {tx.cohorts ? ` · ${tx.cohorts.name}` : ""}
                            </span>
                            <span className="text-gray-400 shrink-0">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </span>
                            {tx.source === "manual" && (
                              <button
                                onClick={() => deleteTransaction(u.user_id, tx.id)}
                                className="text-gray-300 hover:text-red-500 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
