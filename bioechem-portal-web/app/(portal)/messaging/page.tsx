import type { Metadata } from "next";
import { Suspense } from "react";

import { PortalPage } from "@/components/portal/portal-page";
import { AdminMessagingShell } from "@/components/messaging/admin-messaging-shell";
import { MessageThread } from "@/components/messaging/message-thread";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Messaging" };

export default async function MessagingPage() {
  const { user, profile } = await requireSession({ requireApproved: true });
  const isAdmin = profile.role === "bioechem_admin";

  if (isAdmin) {
    // Full-height split-pane — bypass PortalPage wrapper so we control height
    return (
      <div className="flex flex-1 flex-col overflow-hidden p-4 sm:p-6 lg:p-8" style={{ height: "calc(100vh - 0px)" }}>
        <div className="mb-4 shrink-0">
          <h1 className="text-2xl font-semibold text-bio-green">Messaging</h1>
          <p className="mt-1 text-sm text-bio-text-muted">Conversations with portal users.</p>
        </div>
        <div className="relative flex-1 min-h-0">
          <Suspense>
            <AdminMessagingShell currentAdminId={user.id} />
          </Suspense>
        </div>
      </div>
    );
  }

  // Non-admin: full-height single thread
  return (
    <div className="flex flex-1 flex-col overflow-hidden p-4 sm:p-6 lg:p-8" style={{ height: "calc(100vh - 0px)" }}>
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-semibold text-bio-green">Messaging</h1>
        <p className="mt-1 text-sm text-bio-text-muted">Your direct conversation with BioEchem Admin.</p>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-card-border bg-card shadow-[var(--shadow-card)]">
        <MessageThread userId={user.id} />
      </div>
    </div>
  );
}
