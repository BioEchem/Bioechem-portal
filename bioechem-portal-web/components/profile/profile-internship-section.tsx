"use client";

import { useState } from "react";
import { PortalCard } from "@/components/portal/portal-page";

export function ProfileInternshipSection({
  initialValue,
}: {
  initialValue: boolean;
}) {
  const [checked, setChecked] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function toggle(next: boolean) {
    setChecked(next);
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "internship", interestedInInternship: next }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? "Failed to save.");
      }
      setStatus("saved");
    } catch {
      setChecked(!next); // revert
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PortalCard>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-green">
        Internship Interest
      </h2>
      <label className="flex cursor-pointer items-start gap-4">
        <div className="relative mt-0.5 flex-shrink-0">
          <input
            type="checkbox"
            className="sr-only"
            checked={checked}
            disabled={saving}
            onChange={(e) => void toggle(e.target.checked)}
          />
          <div
            onClick={() => !saving && void toggle(!checked)}
            className={`h-6 w-11 rounded-full transition-colors ${checked ? "bg-bio-green" : "bg-gray-300"} ${saving ? "opacity-60" : "cursor-pointer"}`}
          />
          <div
            className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-bio-text">I am interested in internship opportunities</p>
          <p className="mt-0.5 text-xs text-bio-text-muted">
            BioEChem admins can see this flag and may reach out about relevant internship openings.
          </p>
          {status === "saved" && (
            <p className="mt-1 text-xs text-bio-green">Saved!</p>
          )}
          {status === "error" && (
            <p className="mt-1 text-xs text-red-500">Failed to save. Please try again.</p>
          )}
        </div>
      </label>
    </PortalCard>
  );
}
