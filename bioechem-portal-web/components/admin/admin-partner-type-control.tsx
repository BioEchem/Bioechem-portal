"use client";

import { useState } from "react";
import { PARTNER_TYPES } from "@/lib/partner/folder-categories";

export function AdminPartnerTypeControl({
  userId,
  initialPartnerType,
}: {
  userId: string;
  initialPartnerType: string | null;
}) {
  const [value, setValue] = useState(initialPartnerType ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: string) {
    setValue(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerType: next || null }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? "Failed to save.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <select
        value={value}
        onChange={(e) => void handleChange(e.target.value)}
        disabled={saving}
        className="rounded-lg border border-card-border bg-white px-3 py-1.5 text-sm text-bio-text focus:border-bio-green focus:outline-none disabled:opacity-60"
      >
        <option value="">Unspecified</option>
        {PARTNER_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
