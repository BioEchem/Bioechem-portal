"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ShareholderDocsList } from "@/components/shareholder/shareholder-docs-list";
import { ShareholderAnnouncementsList } from "@/components/shareholder/shareholder-announcements-list";

type Doc = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

type TabKey = "documents" | "announcements";

export function ShareholderDocsTabs({ docs }: { docs: Doc[] }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<TabKey>(initialTab === "announcements" ? "announcements" : "documents");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-card-border">
        {[
          { key: "documents" as const, label: "Documents" },
          { key: "announcements" as const, label: "Announcements" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-bio-green text-bio-green"
                : "border-transparent text-bio-text-muted hover:text-bio-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "documents" ? <ShareholderDocsList docs={docs} /> : <ShareholderAnnouncementsList />}
    </div>
  );
}
