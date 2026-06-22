"use client";

import Link from "next/link";

type Tab = { key: string; label: string; href?: string; badge?: number };

export function CohortTabs({
  tabs,
  activeTab,
  cohortId,
  backHref,
}: {
  tabs: Tab[];
  activeTab: string;
  cohortId: string;
  backHref?: string;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-card-border bg-card p-1">
      {tabs.map((tab) => {
        const base = tab.href ?? `/cohorts/${cohortId}?tab=${tab.key}`;
        const href = backHref ? `${base}&back=${encodeURIComponent(backHref)}` : base;
        return (
        <Link
          key={tab.key}
          href={href}
          className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === tab.key
              ? "bg-bio-green text-white"
              : "text-bio-text-muted hover:text-bio-text"
          }`}
        >
          {tab.label}
          {tab.badge != null && tab.badge > 0 ? (
            <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
              activeTab === tab.key ? "bg-white/30 text-white" : "bg-amber-500 text-white"
            }`}>
              {tab.badge}
            </span>
          ) : null}
        </Link>
        );
      })}
    </div>
  );
}
