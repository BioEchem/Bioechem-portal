"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, MessageSquare } from "lucide-react";

type Props = {
  profileId: string;
  approvalStatus: string;
  messagingHref: string;
};

export function AdminProfileActions({ profileId, approvalStatus, messagingHref }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(approvalStatus);

  async function act(action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/approvals/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json() as { error?: { message: string } };
    setBusy(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Action failed.");
      return;
    }
    setStatus(action === "approve" ? "approved" : "rejected");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {status !== "approved" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act("approve")}
            className="flex items-center gap-1.5 rounded-lg bg-bio-green px-3 py-1.5 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60 transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            {busy ? "Saving…" : "Approve"}
          </button>
        )}
        {status !== "rejected" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act("reject")}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-60 transition-colors"
          >
            <XCircle className="h-4 w-4" />
            {busy ? "Saving…" : "Reject"}
          </button>
        )}
        <Link
          href={messagingHref}
          className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium text-bio-text-muted hover:bg-bio-mint/30 transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          Message
        </Link>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
