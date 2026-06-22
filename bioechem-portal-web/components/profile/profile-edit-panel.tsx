"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

type ProfileEditPanelProps = {
  title: string;
  actionLabel?: string;
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  feedback?: ReactNode;
  wide?: boolean;
};

export function ProfileEditPanel({
  title,
  actionLabel = "Edit",
  open,
  pending,
  onClose,
  onSubmit,
  children,
  feedback,
  wide = false,
}: ProfileEditPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh] sm:pt-[10vh]">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close editor"
        onClick={pending ? undefined : onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-panel-title"
        className={`relative z-10 flex max-h-[min(85vh,800px)] w-full ${wide ? "max-w-2xl" : "max-w-lg"} flex-col overflow-hidden rounded-xl border border-card-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.18)]`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-card-border px-5 py-4">
          <h3
            id="profile-edit-panel-title"
            className="text-base font-semibold text-bio-green"
          >
            {actionLabel} {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex size-8 items-center justify-center rounded-lg text-bio-text-muted transition-colors hover:bg-bio-mint/50 hover:text-bio-text disabled:opacity-50"
            aria-label="Cancel"
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {feedback}
            <div className="space-y-4">{children}</div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-card-border px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="bio-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="bio-btn-primary min-w-[5.5rem]"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
