import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { AdminSchoolForm } from "@/components/admin/admin-school-form";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New school" };

export default async function AdminSchoolNewPage() {
  await requireSession({
    requireApproved: true,
    requiredRole: "bioechem_admin",
  });

  return (
    <PortalPage title="New school" description="Add a new partner school to the platform">
      <div className="space-y-4">
        <Link
          href="/admin/schools"
          className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ChevronLeft className="h-4 w-4" /> Back to schools
        </Link>

        <PortalCard>
          <AdminSchoolForm school={null} />
        </PortalCard>
      </div>
    </PortalPage>
  );
}
