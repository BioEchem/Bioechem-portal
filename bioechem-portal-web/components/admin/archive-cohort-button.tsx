"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, AlertTriangle, X } from "lucide-react";

export function ArchiveCohortButton({
  cohortId,
  cohortName,
}: {
  cohortId: string;
  cohortName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"confirm" | "running" | "done" | "error">("confirm");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");

  function reset() {
    setOpen(false);
    setStep("confirm");
    setConfirm("");
    setErrorMsg(null);
  }

  async function runArchive() {
    setStep("running");
    try {
      const res = await fetch(`/api/admin/cohorts/${cohortId}/archive`, { method: "POST" });

      if (!res.ok) {
        // Error responses are JSON
        const json = await res.json() as { error?: string };
        setErrorMsg(json.error ?? "Archive failed.");
        setStep("error");
        return;
      }

      // Success response is a ZIP binary
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cohort-${cohortName.replace(/\s+/g, "-").toLowerCase()}-archive-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setStep("done");
      router.refresh();
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStep("error");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        <Archive className="h-4 w-4" />
        Archive & purge
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-card-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-bio-text">Archive cohort</h2>
              <p className="text-xs text-bio-text-muted mt-0.5">{cohortName}</p>
            </div>
          </div>
          {step !== "running" && (
            <button onClick={reset} className="text-bio-text-muted hover:text-bio-text">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">

          {step === "confirm" && (
            <>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
                <p className="text-sm font-medium text-red-700">This action permanently deletes:</p>
                <ul className="text-sm text-red-600 space-y-1 list-disc list-inside">
                  <li>All modules, module items, and assignment content</li>
                  <li>All student submissions and uploaded files</li>
                  <li>All grades and feedback</li>
                  <li>All surveys and survey responses</li>
                  <li>All certificates and uploaded certificate files</li>
                  <li>All announcements and enrollment records</li>
                </ul>
                <p className="text-sm text-red-700 font-medium mt-2">
                  A full ZIP archive (export.json + all uploaded files) is automatically downloaded before deletion so you have a permanent backup.
                </p>
              </div>

              <div>
                <label className="block text-sm text-bio-text-muted mb-2">
                  Type <strong className="text-bio-text">{cohortName}</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={cohortName}
                  className="w-full rounded-lg border border-card-border px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={reset}
                  className="flex-1 rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={runArchive}
                  disabled={confirm !== cohortName}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Archive & purge data
                </button>
              </div>
            </>
          )}

          {step === "running" && (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-bio-green border-t-transparent" />
              <p className="text-sm text-bio-text-muted">
                Exporting data, deleting files, and purging records…
              </p>
              <p className="text-xs text-bio-text-muted">Do not close this window.</p>
            </div>
          )}

          {step === "done" && (
            <div className="py-4 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Archive className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-bio-text">Cohort archived successfully</p>
              <p className="text-xs text-bio-text-muted">
                A ZIP archive (data export + all uploaded files) was downloaded to your device. All cohort content has been removed from Supabase.
              </p>
              <button
                onClick={reset}
                className="rounded-lg bg-bio-green px-5 py-2 text-sm font-medium text-white hover:bg-bio-green/90"
              >
                Done
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="py-4 space-y-3">
              <p className="text-sm text-red-600">{errorMsg}</p>
              <div className="flex gap-3">
                <button onClick={reset} className="rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text">
                  Cancel
                </button>
                <button
                  onClick={() => { setStep("confirm"); setErrorMsg(null); }}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
