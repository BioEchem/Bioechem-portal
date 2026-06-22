import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { EnrollmentReviewTable, type ReviewableEnrollment, type ReviewerNames } from "@/components/cohorts/enrollment-review-table";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Roster" };

type AssignmentRow = {
  id: string;
  max_points: number;
  module_items: { title: string } | null;
};

type GradeRow = {
  user_id: string;
  assignment_id: string;
  points_earned: number | null;
};

export default async function RosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: cohortId } = await params;

  const { supabase, user, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "approval_status, role",
  });

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, name, max_enrollment")
    .eq("id", cohortId)
    .single();
  if (!cohort) notFound();

  const { data: myEnrollment } = await supabase
    .from("cohort_enrollments")
    .select("role, status")
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .maybeSingle();

  const isBioAdmin = profile.role === "bioechem_admin";
  const isSchoolAdmin = profile.role === "school_admin";
  const isTeacher = myEnrollment?.role === "teacher" && myEnrollment?.status === "approved";

  // Bio admin and school admin can also manage teacher enrollments
  const canManageTeachers = isBioAdmin || isSchoolAdmin;
  // Teachers, school admins, and bio admins can manage participant enrollments
  const canManageParticipants = isBioAdmin || isSchoolAdmin || isTeacher;

  if (!canManageParticipants) notFound();

  const [enrollmentsRes, assignmentsRes, gradesRes] = await Promise.all([
    supabase
      .from("cohort_enrollments")
      .select("id, user_id, role, status, enrolled_at, reviewed_at, reviewed_by, profiles!user_id(full_name, email, avatar_url)")
      .eq("cohort_id", cohortId)
      .order("enrolled_at")
      .returns<ReviewableEnrollment & { profiles: { full_name: string | null; email: string | null; avatar_url: string | null } | null }>(),
    supabase
      .from("assignments")
      .select("id, max_points, module_items(title)")
      .eq("cohort_id", cohortId)
      .returns<AssignmentRow[]>(),
    supabase
      .from("grades")
      .select("user_id, assignment_id, points_earned")
      .eq("cohort_id", cohortId)
      .returns<GradeRow[]>(),
  ]);

  const enrollments = (enrollmentsRes.data ?? []) as (ReviewableEnrollment & { profiles: { full_name: string | null; email: string | null; avatar_url: string | null } | null })[];
  const assignments = assignmentsRes.data ?? [];
  const grades = gradesRes.data ?? [];

  // Fetch reviewer names
  const reviewerIds = [...new Set(
    enrollments.map((e) => e.reviewed_by).filter((id): id is string => !!id)
  )];
  const reviewerNames: ReviewerNames = {};
  if (reviewerIds.length > 0) {
    const { data: reviewerProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", reviewerIds);
    for (const p of reviewerProfiles ?? []) {
      reviewerNames[p.id] = p.full_name ?? p.email ?? "Admin";
    }
  }

  // Grade lookup: userId → assignmentId → points
  const gradeMap = new Map<string, Map<string, number | null>>();
  for (const g of grades) {
    if (!gradeMap.has(g.user_id)) gradeMap.set(g.user_id, new Map());
    gradeMap.get(g.user_id)!.set(g.assignment_id, g.points_earned);
  }

  const approvedParticipants = enrollments.filter((e) => e.role === "participant" && e.status === "approved");
  const teacherEnrollments = enrollments.filter((e) => e.role === "teacher");
  const participantEnrollments = enrollments.filter((e) => e.role === "participant");
  const pendingCount = enrollments.filter((e) => e.status === "pending").length;

  return (
    <PortalPage title="Roster" description={cohort.name}>
      <div className="space-y-4">
        <Link
          href={`/cohorts/${cohortId}`}
          className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ChevronLeft className="h-4 w-4" /> Back to cohort
        </Link>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Students", value: approvedParticipants.length },
            { label: "Teachers", value: teacherEnrollments.filter((e) => e.status === "approved").length },
            { label: "Pending", value: pendingCount },
          ].map((s) => (
            <PortalCard key={s.label} className="text-center">
              <p className="text-2xl font-bold text-bio-green">{s.value}</p>
              <p className="text-xs text-bio-text-muted">{s.label}</p>
            </PortalCard>
          ))}
        </div>

        {/* Enrollment management */}
        <PortalCard>
          <div className="space-y-8">
            {/* Teacher enrollments — visible only to bio/school admin */}
            {canManageTeachers ? (
              <EnrollmentReviewTable
                title="Teachers"
                rows={teacherEnrollments}
                reviewerNames={reviewerNames}
                canManage={canManageTeachers}
              />
            ) : (
              /* Teachers see a read-only teacher list */
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-green">Teachers</h3>
                {teacherEnrollments.length === 0 ? (
                  <p className="text-sm text-bio-text-muted">No teachers enrolled.</p>
                ) : (
                  <div className="divide-y divide-card-border">
                    {teacherEnrollments.map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium text-bio-text">
                            {e.profiles?.full_name ?? e.profiles?.email ?? "Unknown"}
                          </p>
                          <p className="text-xs text-bio-text-muted">{e.profiles?.email}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          e.status === "approved" ? "bg-bio-green/10 text-bio-green"
                          : e.status === "pending" ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-500"
                        }`}>
                          {e.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-card-border pt-6">
              {/* Participant enrollments — teachers, school admins, bio admins can manage */}
              <EnrollmentReviewTable
                title="Students / Participants"
                rows={participantEnrollments}
                reviewerNames={reviewerNames}
                canManage={canManageParticipants}
                maxEnrollment={(cohort as Record<string, unknown>).max_enrollment as number | null}
              />
            </div>
          </div>
        </PortalCard>

        {/* Grade book — approved participants only */}
        {approvedParticipants.length > 0 && assignments.length > 0 ? (
          <PortalCard>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">
              Grade book
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border text-left text-xs text-bio-text-muted">
                    <th className="pb-2 pr-4 font-medium">Student</th>
                    {assignments.map((a) => (
                      <th key={a.id} className="pb-2 pr-4 font-medium whitespace-nowrap">
                        {a.module_items?.title ?? "Assignment"}
                        <span className="ml-1 font-normal">/{a.max_points}</span>
                      </th>
                    ))}
                    <th className="pb-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {approvedParticipants.map((e) => {
                    const userGrades = gradeMap.get(e.user_id) ?? new Map<string, number | null>();
                    const totalEarned = assignments.reduce(
                      (sum, a) => sum + (userGrades.get(a.id) ?? 0),
                      0,
                    );
                    const totalMax = assignments.reduce((sum, a) => sum + a.max_points, 0);

                    return (
                      <tr key={e.id}>
                        <td className="py-3 pr-4 font-medium text-bio-text">
                          {e.profiles?.full_name ?? e.profiles?.email ?? "Unknown"}
                        </td>
                        {assignments.map((a) => {
                          const pts = userGrades.get(a.id);
                          return (
                            <td key={a.id} className="py-3 pr-4">
                              {pts != null ? (
                                <span className={pts / a.max_points >= 0.7 ? "text-bio-green font-medium" : "text-red-500 font-medium"}>
                                  {pts}
                                </span>
                              ) : (
                                <span className="text-bio-text-muted">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-3 font-medium text-bio-text">
                          {totalEarned} / {totalMax}
                          <span className="ml-1 text-xs text-bio-text-muted">
                            ({totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </PortalCard>
        ) : null}
      </div>
    </PortalPage>
  );
}
