import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { PendingEnrollmentsView, type PendingEnrollmentRow } from "@/components/admin/pending-enrollments-view";
import { PortalPage } from "@/components/portal/portal-page";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Pending cohort enrollments" };

type EnrollmentRow = {
  id: string;
  user_id: string;
  role: "participant" | "teacher";
  enrolled_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
  cohorts: { id: string; name: string; school_id: string | null; schools: { name: string } | null } | null;
};

export default async function AdminPendingEnrollmentsPage() {
  const { supabase, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "approval_status, role, school_id",
  });

  const isBioAdmin = profile.role === "bioechem_admin";
  const isSchoolAdmin = profile.role === "school_admin";

  let query = supabase
    .from("cohort_enrollments")
    .select("id, user_id, role, enrolled_at, profiles!user_id(full_name, email), cohorts(id, name, school_id, schools(name))")
    .eq("status", "pending")
    .order("enrolled_at", { ascending: true });

  if (isSchoolAdmin && !isBioAdmin) {
    const schoolAdminProfile = profile as typeof profile & { school_id: string | null };
    if (schoolAdminProfile.school_id) {
      query = query.eq("cohorts.school_id", schoolAdminProfile.school_id);
    }
  }

  const { data } = await query.returns<EnrollmentRow[]>();

  const rows: PendingEnrollmentRow[] = (data ?? [])
    .filter((e) => e.cohorts != null)
    .map((e) => ({
      id: e.id,
      userId: e.user_id,
      name: e.profiles?.full_name ?? null,
      email: e.profiles?.email ?? null,
      cohortRole: e.role,
      cohortId: e.cohorts!.id,
      cohortName: e.cohorts!.name,
      schoolName: e.cohorts!.schools?.name ?? null,
      enrolledAt: e.enrolled_at,
    }));

  return (
    <PortalPage
      title="Pending cohort enrollments"
      description="Review and approve or reject requests to join a cohort, across every cohort."
    >
      <div className="space-y-4">
        <Link
          href="/admin/cohorts"
          className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ChevronLeft className="h-4 w-4" /> All cohorts
        </Link>

        <PendingEnrollmentsView rows={rows} />
      </div>
    </PortalPage>
  );
}
