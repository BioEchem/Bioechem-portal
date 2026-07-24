import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { AdminSchoolForm } from "@/components/admin/admin-school-form";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Edit school" };

export default async function AdminSchoolEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { supabase } = await requireSession({
    requireApproved: true,
    requiredRole: "bioechem_admin",
  });

  const { data: school } = await supabase
    .from("schools")
    .select("id, name, slug, description, city, state, country, website, contact_name, contact_title, contact_email, contact_phone, is_partner, is_active")
    .eq("id", id)
    .single();

  if (!school) notFound();

  return (
    <PortalPage title="Edit school" description={school.name}>
      <div className="space-y-4">
        <Link
          href={`/admin/schools/${id}`}
          className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ChevronLeft className="h-4 w-4" /> Back to school overview
        </Link>

        <PortalCard>
          <AdminSchoolForm school={school} />
        </PortalCard>
      </div>
    </PortalPage>
  );
}
