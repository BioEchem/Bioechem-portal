import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, FileText, Images } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Website Content" };

export default async function AdminContentPage() {
  await requireSession({ requireApproved: true, requiredRole: "bioechem_admin" });

  return (
    <PortalPage
      title="Website Content"
      description="Manage newsletters, upcoming events, and past events that appear on the public landing page."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/content/newsletters" className="group block">
          <PortalCard className="transition-shadow hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bio-green/10">
                <FileText className="h-5 w-5 text-bio-green" />
              </div>
              <div>
                <h2 className="font-semibold text-bio-text group-hover:text-bio-green">Newsletters</h2>
                <p className="mt-1 text-sm text-bio-text-muted">
                  Add, edit, and publish newsletters. Upload PDFs that appear in the newsletter section.
                </p>
              </div>
            </div>
          </PortalCard>
        </Link>

        <Link href="/admin/content/upcoming-events" className="group block">
          <PortalCard className="transition-shadow hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bio-green/10">
                <CalendarDays className="h-5 w-5 text-bio-green" />
              </div>
              <div>
                <h2 className="font-semibold text-bio-text group-hover:text-bio-green">Upcoming Events</h2>
                <p className="mt-1 text-sm text-bio-text-muted">
                  Add upcoming events with date, location, description, and registration links.
                </p>
              </div>
            </div>
          </PortalCard>
        </Link>

        <Link href="/admin/content/past-events" className="group block">
          <PortalCard className="transition-shadow hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bio-green/10">
                <Images className="h-5 w-5 text-bio-green" />
              </div>
              <div>
                <h2 className="font-semibold text-bio-text group-hover:text-bio-green">Past Events</h2>
                <p className="mt-1 text-sm text-bio-text-muted">
                  Add past events with photos, highlights, and descriptions shown in the events gallery.
                </p>
              </div>
            </div>
          </PortalCard>
        </Link>
      </div>
    </PortalPage>
  );
}
