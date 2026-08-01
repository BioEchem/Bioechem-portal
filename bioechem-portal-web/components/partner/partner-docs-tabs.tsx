"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PartnerDocsList } from "@/components/partner/partner-docs-list";
import { PartnerOwnFolder } from "@/components/partner/partner-own-folder";
import { PartnerAnnouncementsList } from "@/components/partner/partner-announcements-list";

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

type TabKey = "shared" | "folder" | "announcements";

export function PartnerDocsTabs({
  currentUserId,
  sharedDocs,
}: {
  currentUserId: string;
  sharedDocs: Doc[];
}) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<TabKey>(
    initialTab === "announcements" || initialTab === "folder" ? initialTab : "shared",
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-card-border">
        {[
          { key: "shared" as const, label: "Shared with all partners" },
          { key: "folder" as const, label: "My folder" },
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

      {tab === "shared" ? (
        <PartnerDocsList docs={sharedDocs} />
      ) : tab === "folder" ? (
        <PartnerOwnFolder currentUserId={currentUserId} />
      ) : (
        <PartnerAnnouncementsList />
      )}
    </div>
  );
}
