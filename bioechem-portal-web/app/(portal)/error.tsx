"use client";

import { useEffect } from "react";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Portal error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-xl border border-card-border bg-card p-8 shadow-[var(--shadow-card)]">
        <h2 className="mb-2 text-lg font-semibold text-bio-text">
          Something went wrong
        </h2>
        <p className="mb-6 text-sm text-bio-text-muted">
          {error.message ?? "An unexpected error occurred. Please try again."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
