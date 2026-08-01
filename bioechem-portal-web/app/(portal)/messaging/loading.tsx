import { SkeletonLine } from "@/components/portal/portal-skeleton";

export default function MessagingLoading() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden p-4 sm:p-6 lg:p-8" style={{ height: "calc(100vh - 0px)" }}>
      <div className="mb-4 shrink-0">
        <SkeletonLine className="h-7 w-40" />
        <SkeletonLine className="mt-2 h-4 w-64" />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-card-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-bio-green border-t-transparent" />
        </div>
      </div>
    </div>
  );
}
