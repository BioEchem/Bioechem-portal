"use client";

import { useEffect, useState } from "react";
import { Award, BookOpen, Star, Trophy, Zap } from "lucide-react";

type Transaction = {
  id: string;
  source: "grade" | "completion" | "manual";
  cohort_id: string | null;
  points: number;
  note: string | null;
  created_at: string;
  cohorts: { name: string } | null;
};

type PointsData = {
  total: number;
  transactions: Transaction[];
};

const SOURCE_META: Record<Transaction["source"], { label: string; icon: React.ReactNode; color: string }> = {
  grade: {
    label: "Assignment grade",
    icon: <BookOpen className="w-4 h-4" />,
    color: "text-blue-600 bg-blue-50",
  },
  completion: {
    label: "Cohort completion",
    icon: <Trophy className="w-4 h-4" />,
    color: "text-amber-600 bg-amber-50",
  },
  manual: {
    label: "Manual award",
    icon: <Zap className="w-4 h-4" />,
    color: "text-emerald-600 bg-emerald-50",
  },
};

function PointsBadge({ total }: { total: number }) {
  if (total >= 1000) return { tier: "Gold", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
  if (total >= 500) return { tier: "Silver", color: "text-slate-600", bg: "bg-slate-50 border-slate-200" };
  if (total >= 200) return { tier: "Bronze", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" };
  return { tier: "Starter", color: "text-green-700", bg: "bg-green-50 border-green-200" };
}

export function RewardsView() {
  const [data, setData] = useState<PointsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/points/me")
      .then((r) => r.json())
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 rounded-xl bg-gray-100" />
        <div className="h-64 rounded-xl bg-gray-100" />
      </div>
    );
  }

  const total = data?.total ?? 0;
  const transactions = data?.transactions ?? [];
  const { tier, color, bg } = PointsBadge({ total });

  const nextTier = total < 200 ? 200 : total < 500 ? 500 : total < 1000 ? 1000 : null;
  const prevTier = total < 200 ? 0 : total < 500 ? 200 : total < 1000 ? 500 : 1000;
  const progress = nextTier ? ((total - prevTier) / (nextTier - prevTier)) * 100 : 100;

  return (
    <div className="space-y-6">
      {/* Total card */}
      <div className={`rounded-xl border p-6 ${bg}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Points</p>
            <p className={`text-5xl font-bold mt-1 ${color}`}>{total.toLocaleString()}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <Award className={`w-4 h-4 ${color}`} />
              <span className={`text-sm font-semibold ${color}`}>{tier} tier</span>
            </div>
          </div>
          <Star className={`w-12 h-12 opacity-20 ${color}`} />
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{total.toLocaleString()} pts</span>
              <span>{nextTier.toLocaleString()} pts for next tier</span>
            </div>
            <div className="h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${color.replace("text-", "bg-")}`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tier guide */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { tier: "Starter", min: 0, color: "text-green-700" },
          { tier: "Bronze", min: 200, color: "text-orange-700" },
          { tier: "Silver", min: 500, color: "text-slate-600" },
          { tier: "Gold", min: 1000, color: "text-amber-600" },
        ].map((t) => (
          <div
            key={t.tier}
            className={`rounded-lg border px-3 py-2 text-center text-sm ${total >= t.min ? "border-current opacity-100" : "opacity-40"} ${t.color}`}
          >
            <p className="font-semibold">{t.tier}</p>
            <p className="text-xs">{t.min.toLocaleString()}+ pts</p>
          </div>
        ))}
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Point History</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            No points yet. Complete graded assignments to start earning!
          </p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {transactions.map((tx) => {
              const meta = SOURCE_META[tx.source];
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3 bg-white">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${meta.color}`}>
                    {meta.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {tx.note ?? meta.label}
                    </p>
                    <p className="text-xs text-gray-400">
                      {tx.cohorts?.name ? `${tx.cohorts.name} · ` : ""}
                      {new Date(tx.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${tx.points >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {tx.points >= 0 ? "+" : ""}{tx.points}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
