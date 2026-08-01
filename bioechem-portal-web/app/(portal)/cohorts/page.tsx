import type { Metadata } from "next";

import { PortalPage } from "@/components/portal/portal-page";
import { AdminPreviewBanner } from "@/components/portal/admin-preview-banner";
import { CohortBrowseCard } from "@/components/cohorts/cohort-browse-card";
import { requireSession } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getDisplayName } from "@/lib/profile/display";

export const metadata: Metadata = { title: "Courses" };

type CohortRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  max_enrollment: number | null;
  enrollment_requires_approval: boolean;
  schools: { name: string } | null;
};

type EnrollmentRow = {
  cohort_id: string;
  role: string;
  status: string;
};

export default async function CohortsPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { as: asUserId } = await searchParams;
  const { supabase, user, profile } = await requireSession({ requireApproved: true });

  const isBioAdminViewing = profile.role === "bioechem_admin" && !!asUserId;
  const targetUserId = isBioAdminViewing ? asUserId! : user.id;
  const dataClient = isBioAdminViewing ? (createServiceRoleClient() ?? supabase) : supabase;

  let targetName: string | null = null;
  if (isBioAdminViewing) {
    const { data: tp } = await dataClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", targetUserId)
      .maybeSingle<{ full_name: string | null; email: string | null }>();
    targetName = getDisplayName(tp?.full_name ?? null, tp?.email ?? null);
  }

  const [{ data: cohorts }, { data: enrollments }] = await Promise.all([
    supabase
      .from("cohorts")
      .select("id, name, description, status, start_date, end_date, max_enrollment, enrollment_requires_approval, schools(name)")
      .eq("status", "active")
      .eq("is_active", true)
      .order("name")
      .returns<CohortRow[]>(),
    dataClient
      .from("cohort_enrollments")
      .select("cohort_id, role, status")
      .eq("user_id", targetUserId)
      .returns<EnrollmentRow[]>(),
  ]);

  const enrollmentMap = new Map(
    (enrollments ?? []).map((e) => [e.cohort_id, e]),
  );

  const rows = cohorts ?? [];
  const asQuery = isBioAdminViewing ? `?as=${asUserId}` : "";

  return (
    <PortalPage
      title="Courses"
      description="Browse available courses and classes. Enroll to access course content."
    >
      {isBioAdminViewing && targetName ? (
        <div className="mb-4">
          <AdminPreviewBanner targetName={targetName} targetUserId={asUserId!} action="courses" />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-bio-text-muted">No cohorts are available right now.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((cohort) => (
            <CohortBrowseCard
              key={cohort.id}
              cohort={cohort}
              enrollment={enrollmentMap.get(cohort.id) ?? null}
              href={`/cohorts/${cohort.id}${asQuery}`}
              readOnly={isBioAdminViewing}
            />
          ))}
        </div>
      )}
    </PortalPage>
  );
}
