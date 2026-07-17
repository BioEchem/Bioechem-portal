import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Settings,
  Globe,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  User,
} from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "School overview" };

type SchoolAdmin = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  approved_at: string | null;
};

type CohortRow = {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
};

type PersonRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  approval_status: string;
};

type EnrolledRow = {
  user_id: string;
  cohort_id: string;
  profiles: { full_name: string | null; email: string | null } | null;
  cohorts: { name: string } | null;
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-bio-green/10 text-bio-green",
  draft: "bg-amber-100 text-amber-700",
  archived: "bg-bio-text-muted/10 text-bio-text-muted",
};

export default async function AdminSchoolOverviewPage({
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
    .select(
      "id, name, description, city, state, country, website, contact_name, contact_email, contact_phone, is_partner, is_active, created_at",
    )
    .eq("id", id)
    .single();

  if (!school) notFound();

  // Fetch school admins, cohorts, teachers, and registered student count in parallel
  const [adminsRes, cohortsRes, teachersRes, studentsCountRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, approved_at")
      .eq("school_id", id)
      .eq("role", "school_admin")
      .eq("approval_status", "approved")
      .order("full_name")
      .returns<SchoolAdmin[]>(),

    supabase
      .from("cohorts")
      .select("id, name, status, start_date, end_date, is_active")
      .eq("school_id", id)
      .order("name")
      .returns<CohortRow[]>(),

    supabase
      .from("profiles")
      .select("id, full_name, email, approval_status")
      .eq("school_id", id)
      .eq("role", "teacher")
      .order("full_name")
      .returns<PersonRow[]>(),

    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", id)
      .eq("role", "participant"),
  ]);

  const admins = adminsRes.data ?? [];
  const cohorts = cohortsRes.data ?? [];
  const teachers = teachersRes.data ?? [];
  const studentCount = studentsCountRes.count ?? 0;
  const cohortIds = cohorts.map((c) => c.id);

  // Fetch enrolled students across all school cohorts (only if cohorts exist)
  let enrolledRows: EnrolledRow[] = [];
  if (cohortIds.length > 0) {
    const { data } = await supabase
      .from("cohort_enrollments")
      .select("user_id, cohort_id, profiles!user_id(full_name, email), cohorts(name)")
      .in("cohort_id", cohortIds)
      .eq("status", "approved")
      .eq("role", "participant")
      .order("user_id")
      .returns<EnrolledRow[]>();
    enrolledRows = data ?? [];
  }

  // Deduplicate enrolled students by user_id (keep first cohort name)
  const seen = new Set<string>();
  const enrolledStudents = enrolledRows.filter((e) => {
    if (seen.has(e.user_id)) return false;
    seen.add(e.user_id);
    return true;
  });

  const approvedTeachers = teachers.filter((t) => t.approval_status === "approved");
  const pendingTeachers = teachers.filter((t) => t.approval_status === "pending");
  const activeCohorts = cohorts.filter((c) => c.status === "active" && c.is_active);
  const location = [school.city, school.state, school.country]
    .filter(Boolean)
    .join(", ");

  const schoolData = school as typeof school & { created_at: string };

  return (
    <PortalPage title={school.name} description={location || "Partner school"}>
      <div className="space-y-5">
        {/* Back + edit bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/admin/schools"
            className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
          >
            <ChevronLeft className="h-4 w-4" /> All schools
          </Link>
          <Link
            href={`/admin/schools/${id}/edit`}
            className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium text-bio-text hover:border-bio-green hover:text-bio-green"
          >
            <Settings className="h-4 w-4" /> Edit school
          </Link>
        </div>

        {/* School info + stats */}
        <PortalCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-bio-text">{school.name}</h2>
                {school.is_partner ? (
                  <span className="rounded-full bg-bio-green/10 px-2 py-0.5 text-xs font-medium text-bio-green">
                    Partner
                  </span>
                ) : null}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    school.is_active
                      ? "bg-bio-green/10 text-bio-green"
                      : "bg-bio-text-muted/10 text-bio-text-muted"
                  }`}
                >
                  {school.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {school.description ? (
                <p className="mt-1 text-sm text-bio-text-muted">{school.description}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-4 text-sm text-bio-text-muted">
                {location ? (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {location}
                  </span>
                ) : null}
                {school.website ? (
                  <a
                    href={school.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-bio-green"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {school.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : null}
                {school.contact_name ? (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> {school.contact_name}
                  </span>
                ) : null}
                {school.contact_email ? (
                  <a
                    href={`mailto:${school.contact_email}`}
                    className="flex items-center gap-1.5 hover:text-bio-green"
                  >
                    <Mail className="h-3.5 w-3.5" /> {school.contact_email}
                  </a>
                ) : null}
                {school.contact_phone ? (
                  <a
                    href={`tel:${school.contact_phone}`}
                    className="flex items-center gap-1.5 hover:text-bio-green"
                  >
                    <Phone className="h-3.5 w-3.5" /> {school.contact_phone}
                  </a>
                ) : null}
              </div>

              <p className="mt-2 text-xs text-bio-text-muted">
                Added {fmt(schoolData.created_at)}
              </p>
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Active cohorts", value: activeCohorts.length, href: null },
                { label: "Total cohorts", value: cohorts.length, href: `/admin/schools/${id}/cohorts` },
                { label: "Teachers", value: teachers.length, href: `/admin/schools/${id}/teachers` },
                { label: "Registered students", value: studentCount, href: `/admin/schools/${id}/students` },
                { label: "Enrolled in cohorts", value: enrolledStudents.length, href: null },
                { label: "School admins", value: admins.length, href: null },
              ].map((s) => {
                const content = (
                  <div className={`rounded-xl border border-card-border px-4 py-2 text-center ${s.href ? "hover:border-bio-green cursor-pointer transition-colors" : ""}`}>
                    <p className="text-xl font-bold text-bio-green">{s.value}</p>
                    <p className="text-xs text-bio-text-muted">{s.label}</p>
                  </div>
                );
                return s.href ? (
                  <Link key={s.label} href={s.href}>{content}</Link>
                ) : (
                  <div key={s.label}>{content}</div>
                );
              })}
            </div>
          </div>

          {/* School admins — inline strip at bottom of the card */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-card-border pt-4">
            <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-bio-green">
              Admins
            </p>
            {admins.length === 0 ? (
              <p className="text-xs italic text-bio-text-muted/60">No admins linked yet</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bio-green/10 text-xs font-semibold text-bio-green">
                      {(admin.full_name ?? admin.email ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="leading-tight">
                      <span className="text-sm font-medium text-bio-text">{admin.full_name ?? "—"}</span>
                      {admin.email ? (
                        <span className="ml-2 text-xs text-bio-text-muted">
                          <a href={`mailto:${admin.email}`} className="hover:text-bio-green">{admin.email}</a>
                        </span>
                      ) : null}
                      {admin.phone ? (
                        <span className="ml-2 text-xs text-bio-text-muted">
                          <a href={`tel:${admin.phone}`} className="hover:text-bio-green">{admin.phone}</a>
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PortalCard>

        {/* Cohorts */}
        <PortalCard>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
              Cohorts
            </h2>
            <Link
              href={`/admin/cohorts/new?schoolId=${id}`}
              className="text-sm font-medium text-bio-green hover:underline"
            >
              + Add cohort
            </Link>
          </div>
          {cohorts.length === 0 ? (
            <p className="text-sm text-bio-text-muted">
              No cohorts created for this school yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border text-left text-xs text-bio-text-muted">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Dates</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {cohorts.map((cohort) => (
                    <tr key={cohort.id}>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/cohorts/${cohort.id}?back=/admin/schools/${id}`}
                          className="flex items-center gap-2 font-medium text-bio-text hover:text-bio-green"
                        >
                          <GraduationCap className="h-4 w-4 shrink-0 text-bio-green/60" />
                          {cohort.name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            STATUS_STYLES[cohort.status] ??
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {cohort.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {cohort.start_date || cohort.end_date ? (
                          <span className="text-bio-text-muted">
                            {cohort.start_date ? fmt(cohort.start_date) : "TBD"}
                            {" → "}
                            {cohort.end_date ? fmt(cohort.end_date) : "TBD"}
                          </span>
                        ) : (
                          <span className="text-xs italic text-bio-text-muted/60">No dates set</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/admin/cohorts/${cohort.id}/edit`}
                          className="text-xs text-bio-text-muted hover:text-bio-green"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PortalCard>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Teachers */}
          <PortalCard>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">
              Teachers
            </h2>
            {teachers.length === 0 ? (
              <p className="text-sm text-bio-text-muted">
                No teachers linked to this school.
              </p>
            ) : (
              <div className="divide-y divide-card-border">
                {teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-bio-text">
                        {teacher.full_name ?? "—"}
                      </p>
                      {teacher.email ? (
                        <p className="text-xs text-bio-text-muted">{teacher.email}</p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        teacher.approval_status === "approved"
                          ? "bg-bio-green/10 text-bio-green"
                          : teacher.approval_status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-500"
                      }`}
                    >
                      {teacher.approval_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {pendingTeachers.length > 0 ? (
              <p className="mt-3 text-xs text-amber-600">
                {pendingTeachers.length} teacher
                {pendingTeachers.length > 1 ? "s" : ""} pending approval
              </p>
            ) : null}
          </PortalCard>

          {/* Enrolled students */}
          <PortalCard>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">
              Enrolled Students
            </h2>
            {enrolledStudents.length === 0 ? (
              <p className="text-sm text-bio-text-muted">
                No students enrolled in this school&apos;s cohorts yet.
              </p>
            ) : (
              <>
                <div className="divide-y divide-card-border">
                  {enrolledStudents.slice(0, 20).map((e) => (
                    <div
                      key={e.user_id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-bio-text">
                          {e.profiles?.full_name ?? "—"}
                        </p>
                        {e.profiles?.email ? (
                          <p className="text-xs text-bio-text-muted">
                            {e.profiles.email}
                          </p>
                        ) : null}
                      </div>
                      {e.cohorts?.name ? (
                        <span className="shrink-0 text-right text-xs text-bio-text-muted">
                          {e.cohorts.name}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
                {enrolledStudents.length > 20 ? (
                  <p className="mt-3 text-xs text-bio-text-muted">
                    Showing 20 of {enrolledStudents.length} students. View individual cohorts for the full roster.
                  </p>
                ) : null}
              </>
            )}
          </PortalCard>
        </div>
      </div>
    </PortalPage>
  );
}
