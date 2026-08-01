"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { CreditActionItem } from "@/lib/credits/default-content";

export function CreditsContentEditor({
  initialIntroText,
  initialClaimText,
  initialActions,
}: {
  initialIntroText: string;
  initialClaimText: string;
  initialActions: CreditActionItem[];
}) {
  const router = useRouter();
  const [introText, setIntroText] = useState(initialIntroText);
  const [claimText, setClaimText] = useState(initialClaimText);
  const [actions, setActions] = useState<CreditActionItem[]>(initialActions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateAction(index: number, patch: Partial<CreditActionItem>) {
    setActions((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function addAction() {
    setActions((prev) => [...prev, { action: "", credits: "", note: "" }]);
  }

  function removeAction(index: number) {
    setActions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/credits-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intro_text: introText, claim_text: claimText, actions }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to save.");
      router.push("/credits");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">
          Intro text (&quot;How it works&quot; section)
        </label>
        <textarea
          value={introText}
          onChange={(e) => setIntroText(e.target.value)}
          rows={4}
          className="w-full resize-y rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-xs font-medium text-bio-text-muted">Ways to earn credits</label>
          <button
            type="button"
            onClick={addAction}
            className="flex items-center gap-1 text-xs font-medium text-bio-green hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add row
          </button>
        </div>
        <div className="space-y-3">
          {actions.map((item, i) => (
            <div key={i} className="rounded-lg border border-card-border p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  value={item.action}
                  onChange={(e) => updateAction(i, { action: e.target.value })}
                  placeholder="Action, e.g. Update your Career Path"
                  className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.credits}
                    onChange={(e) => updateAction(i, { credits: e.target.value })}
                    placeholder="e.g. 1 credit"
                    className="w-32 rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeAction(i)}
                    className="shrink-0 rounded-lg p-2 text-bio-text-muted hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={item.note ?? ""}
                onChange={(e) => updateAction(i, { note: e.target.value })}
                placeholder="Optional note / detail"
                className="mt-2 w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
              />
            </div>
          ))}
          {actions.length === 0 && (
            <p className="text-sm text-bio-text-muted">No rows yet — click &quot;Add row&quot; to create one.</p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">
          Claim instructions (&quot;How to claim your credits&quot; section)
        </label>
        <textarea
          value={claimText}
          onChange={(e) => setClaimText(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
