import type { Metadata } from "next";

import { PortalPage } from "@/components/portal/portal-page";
import { CohortBrowseCard } from "@/components/cohorts/cohort-browse-card";
import { requireSession } from "@/lib/auth/session";

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

export default async function CohortsPage() {
  const { supabase, user } = await requireSession({ requireApproved: true });

  const [{ data: cohorts }, { data: enrollments }] = await Promise.all([
    supabase
      .from("cohorts")
      .select("id, name, description, status, start_date, end_date, max_enrollment, enrollment_requires_approval, schools(name)")
      .eq("status", "active")
      .eq("is_active", true)
      .order("name")
      .returns<CohortRow[]>(),
    supabase
      .from("cohort_enrollments")
      .select("cohort_id, role, status")
      .eq("user_id", user.id)
      .returns<EnrollmentRow[]>(),
  ]);

  const enrollmentMap = new Map(
    (enrollments ?? []).map((e) => [e.cohort_id, e]),
  );

  const rows = cohorts ?? [];

  return (
    <PortalPage
      title="Courses"
      description="Browse available courses and classes. Enroll to access course content."
    >
      {rows.length === 0 ? (
        <p className="text-sm text-bio-text-muted">No cohorts are available right now.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((cohort) => (
            <CohortBrowseCard
              key={cohort.id}
              cohort={cohort}
              enrollment={enrollmentMap.get(cohort.id) ?? null}
            />
          ))}
        </div>
      )}
    </PortalPage>
  );
}
