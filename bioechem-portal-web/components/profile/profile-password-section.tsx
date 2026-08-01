import Link from "next/link";
import { KeyRound } from "lucide-react";

import { PORTAL_ROUTES } from "@/lib/portal/routes";

export function ProfilePasswordSection() {
  return (
    <div className="flex justify-center border-t border-card-border pt-6">
      <Link
        href={PORTAL_ROUTES.accountPassword}
        className="bio-btn-secondary inline-flex items-center gap-2 px-5 py-2.5"
      >
        <KeyRound className="size-4 shrink-0" aria-hidden />
        Change password
      </Link>
    </div>
  );
}
