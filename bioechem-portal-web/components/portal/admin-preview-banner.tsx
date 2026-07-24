import Link from "next/link";
import { Eye } from "lucide-react";

/** Shown on every page reachable while a bioechem_admin is previewing another user's view ("View as user"). Always offers a way back to that user's admin profile. */
export function AdminPreviewBanner({
  targetName,
  targetUserId,
  action,
}: {
  targetName: string;
  targetUserId: string;
  /** What this page shows, e.g. "dashboard", "courses", "this cohort". */
  action: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-amber-800">
        <Eye className="h-4 w-4 shrink-0" />
        <span>Viewing {action} as <strong>{targetName}</strong> — read-only admin preview</span>
      </div>
      <Link
        href={`/admin/users/${targetUserId}`}
        className="shrink-0 rounded-lg border border-amber-300 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
      >
        Exit user view
      </Link>
    </div>
  );
}
