import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Building2, Calendar, FileText, GraduationCap, MessageSquare, ChevronLeft, LayoutDashboard } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { AdminProfileActions } from "@/components/admin/admin-profile-actions";
import { AdminPartnerTypeControl } from "@/components/admin/admin-partner-type-control";
import { requireSession } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  displayOrDash,
  getApprovalStatusLabel,
  getDisplayName,
  getInitials,
  getRoleLabel,
  getSchoolDisplayName,
} from "@/lib/profile/display";
import { formatShortDate } from "@/lib/format/date";

export const metadata: Metadata = { title: "User profile" };

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  approval_status: string;
  other_school_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  rejection_reason: string | null;
  partner_type: string | null;
  schools: { id: string; name: string } | null;
};

type EnrollmentRow = {
  id: string;
  role: string;
  status: string;
  cohorts: { id: string; name: string } | null;
};

type ResumeRow = {
  id: string;
  url: string;
  filename: string | null;
  uploaded_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  pending:  "bg-yellow-100 text-yellow-800",
  rejected: "bg-red-100 text-red-700",
};

const ENROLL_STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  pending:  "bg-yellow-100 text-yellow-800",
  dropped:  "bg-gray-100 text-gray-600",
};

const SHOW_RESUME_ROLES = new Set(["participant", "teacher"]);

export default async function AdminUserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const { supabase } = await requireSession({ requireApproved: true, requiredRole: "bioechem_admin" });

  // Prefer service role (bypasses RLS); fall back to admin session client which has admin RLS policies
  const db: SupabaseClient = createServiceRoleClient() ?? supabase;

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id, email, full_name, role, approval_status, other_school_name, bio, avatar_url, created_at, rejection_reason, partner_type, schools(id, name)")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (profileError) console.error("Profile fetch error:", profileError.message);
  if (!profile) notFound();

  const { data: enrollments } = await db
    .from("cohort_enrollments")
    .select("id, role, status, cohorts(id, name)")
    .eq("user_id", userId)
    .order("status")
    .returns<EnrollmentRow[]>();

  const { data: resumes } = SHOW_RESUME_ROLES.has(profile.role)
    ? await db
        .from("user_resumes")
        .select("id, url, filename, uploaded_at")
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false })
        .returns<ResumeRow[]>()
    : { data: [] as ResumeRow[] };

  const displayName = getDisplayName(profile.full_name, profile.email);
  const initials = getInitials(profile.full_name, profile.email);
  const schoolName = getSchoolDisplayName(profile);

  return (
    <PortalPage
      title={displayName}
      description={`${getRoleLabel(profile.role)} · ${getApprovalStatusLabel(profile.approval_status)}`}
    >
      <div className="space-y-4">
        {/* Back */}
        <Link
          href="/admin/approvals"
          className="inline-flex items-center gap-1.5 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Users
        </Link>

        {/* Header card */}
        <PortalCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bio-green text-xl font-semibold text-white">
                  {initials}
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-bio-text">{displayName}</h2>
                <p className="text-sm text-bio-text-muted">{getRoleLabel(profile.role)}</p>
                {schoolName && (
                  <p className="text-sm text-bio-text-muted flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {schoolName}
                  </p>
                )}
              </div>
            </div>

            <AdminProfileActions
              profileId={profile.id}
              approvalStatus={profile.approval_status}
              messagingHref={`/messaging?user=${profile.id}`}
            />
          </div>
        </PortalCard>

        {/* Details grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <PortalCard>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-green">Contact</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-bio-text-muted" />
                <span className="text-bio-text break-all">{displayOrDash(profile.email)}</span>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-bio-text-muted" />
                <span className="text-bio-text-muted">Joined {formatShortDate(profile.created_at)}</span>
              </div>
            </dl>
          </PortalCard>

          <PortalCard>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-green">Account status</h3>
            <div className="space-y-2">
              <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[profile.approval_status] ?? "bg-gray-100 text-gray-600"}`}>
                {getApprovalStatusLabel(profile.approval_status)}
              </span>
              {profile.approval_status === "rejected" && profile.rejection_reason && (
                <p className="text-xs text-bio-text-muted">
                  Reason: {profile.rejection_reason}
                </p>
              )}
            </div>
          </PortalCard>

          {profile.role === "industry_partner" && (
            <PortalCard>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-green">Partner type</h3>
              <AdminPartnerTypeControl userId={profile.id} initialPartnerType={profile.partner_type} />
            </PortalCard>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <PortalCard>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-bio-green">Bio</h3>
            <p className="text-sm text-bio-text whitespace-pre-wrap">{profile.bio}</p>
          </PortalCard>
        )}

        {/* Cohort enrollments */}
        <PortalCard>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-bio-green">
            <GraduationCap className="h-4 w-4" />
            Cohort enrollments ({(enrollments ?? []).length})
          </h3>
          {!enrollments || enrollments.length === 0 ? (
            <p className="text-sm text-bio-text-muted">Not enrolled in any cohorts.</p>
          ) : (
            <ul className="space-y-2">
              {enrollments.map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-lg border border-card-border px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-bio-text">
                      {e.cohorts?.name ?? "Unknown cohort"}
                    </p>
                    <p className="text-xs text-bio-text-muted capitalize">{e.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ENROLL_STATUS_STYLES[e.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {e.status}
                    </span>
                    {e.cohorts?.id && (
                      <Link
                        href={`/cohorts/${e.cohorts.id}?as=${userId}&back=${encodeURIComponent(`/admin/users/${userId}`)}`}
                        className="text-xs text-bio-green hover:underline"
                      >
                        View as user →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PortalCard>

        {/* Resume (participants & teachers only) */}
        {SHOW_RESUME_ROLES.has(profile.role) && (
          <PortalCard>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-bio-green">
              <FileText className="h-4 w-4" />
              Resume uploads
            </h3>
            {!resumes || resumes.length === 0 ? (
              <p className="text-sm text-bio-text-muted">No resumes uploaded.</p>
            ) : (
              <ul className="space-y-2">
                {resumes.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border border-card-border px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-bio-text-muted" />
                      <span className="text-sm text-bio-text truncate">{r.filename ?? "Resume"}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-bio-text-muted">{formatShortDate(r.uploaded_at)}</span>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-bio-green hover:underline"
                      >
                        View
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PortalCard>
        )}

        {/* Quick actions */}
        <PortalCard>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bio-green">Quick actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard?as=${profile.id}`}
              className="flex items-center gap-2 rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-bio-text hover:bg-bio-surface transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              View dashboard as user
            </Link>
            <Link
              href={`/messaging?user=${profile.id}`}
              className="flex items-center gap-2 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Open messages
            </Link>
          </div>
        </PortalCard>
      </div>
    </PortalPage>
  );
}
