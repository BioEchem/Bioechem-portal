import Link from "next/link";
import { AlertCircle, Lock } from "lucide-react";

import { PortalCard } from "@/components/portal/portal-page";
import type { ProfileCompletionStatus } from "@/lib/profile/completion";
import { PORTAL_ROUTES } from "@/lib/portal/routes";

type ProfileCompletionPromptProps = {
  status: ProfileCompletionStatus;
  variant: "dashboard" | "profile" | "gate";
  featureName?: string;
};

function MissingFieldList({
  labels,
  urgent,
}: {
  labels: string[];
  urgent: boolean;
}) {
  if (labels.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {labels.map((label) => (
        <li
          key={label}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            urgent
              ? "border-red-300 bg-red-100 text-red-900"
              : "border-amber-300 bg-amber-50 text-amber-950"
          }`}
        >
          {label}
        </li>
      ))}
    </ul>
  );
}

export function ProfileCompletionPrompt({
  status,
  variant,
  featureName,
}: ProfileCompletionPromptProps) {
  if (status.isFullyComplete) return null;

  const showMinimum = !status.hasMinimum;
  const missingLabels = showMinimum
    ? status.missingMinimumLabels
    : status.missingFullLabels.filter(
        (label) => !status.missingMinimumLabels.includes(label),
      );

  if (missingLabels.length === 0) return null;

  if (variant === "gate") {
    return (
      <PortalCard className="mx-auto max-w-lg border-red-300 bg-red-50 text-center shadow-none">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100">
          <Lock className="size-5 text-red-700" aria-hidden />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-red-900">
          Profile details needed
        </h2>
        <p className="mt-2 text-sm text-red-800">
          Add a few details to your profile before accessing{" "}
          <span className="font-semibold">{featureName ?? "this page"}</span>.
        </p>
        <MissingFieldList labels={missingLabels} urgent />
        <Link
          href={PORTAL_ROUTES.account}
          className="mt-5 inline-flex rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800"
        >
          Update profile
        </Link>
      </PortalCard>
    );
  }

  if (variant === "profile") {
    return (
      <div
        className={`rounded-lg border px-4 py-3 ${
          showMinimum
            ? "border-red-300 bg-red-50"
            : "border-amber-300 bg-amber-50"
        }`}
        role="status"
      >
        <div className="flex gap-3">
          <AlertCircle
            className={`mt-0.5 size-4 shrink-0 ${showMinimum ? "text-red-700" : "text-amber-700"}`}
            aria-hidden
          />
          <div className="min-w-0">
            <p
              className={`text-sm font-semibold ${showMinimum ? "text-red-900" : "text-amber-950"}`}
            >
              {showMinimum
                ? "Add these details to unlock courses and assignments"
                : "Finish your profile when you can"}
            </p>
            <p
              className={`mt-1 text-sm ${showMinimum ? "text-red-800" : "text-amber-900"}`}
            >
              {showMinimum
                ? "Save your personal details below, then continue with school information."
                : "These details help your school keep accurate records."}
            </p>
            <MissingFieldList labels={missingLabels} urgent={showMinimum} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <PortalCard
      className={
        showMinimum
          ? "border-red-300 bg-red-50 shadow-none"
          : "border-amber-300 bg-amber-50 shadow-none"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <AlertCircle
              className={`size-4 shrink-0 ${showMinimum ? "text-red-700" : "text-amber-700"}`}
              aria-hidden
            />
            <p
              className={`text-sm font-semibold ${showMinimum ? "text-red-900" : "text-amber-950"}`}
            >
              {showMinimum
                ? "Action required — complete your profile"
                : "Your profile is almost complete"}
            </p>
          </div>
          <p
            className={`mt-1 text-sm ${showMinimum ? "text-red-800" : "text-amber-900"}`}
          >
            {showMinimum
              ? "Courses, assignments, and messaging are locked until you save your name, phone, and address."
              : "Add state and an emergency contact when you have a moment."}
          </p>
          <MissingFieldList labels={missingLabels} urgent={showMinimum} />
        </div>
        <Link
          href={PORTAL_ROUTES.account}
          className={`inline-flex shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            showMinimum
              ? "bg-red-700 text-white hover:bg-red-800"
              : "border border-amber-400 bg-white text-amber-950 hover:bg-amber-100"
          }`}
        >
          {showMinimum ? "Update profile" : "Finish profile"}
        </Link>
      </div>
    </PortalCard>
  );
}
