import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PortalPage } from "@/components/portal/portal-page";
import { CohortTabs } from "@/components/cohorts/cohort-tabs";
import { ClassroomView } from "@/components/cohorts/classroom/classroom-view";
import type { ClassSession, SessionRecording } from "@/components/cohorts/classroom/classroom-view";
import { requireSession } from "@/lib/auth/session";

type Params = { params: Promise<{ id: string }> };

export default async function ClassroomPage({ params }: Params) {
  const { id: cohortId } = await params;

  const { supabase, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "role, approval_status",
  });

  const role = profile.role ?? "participant";
  const canManage = ["teacher", "bioechem_admin"].includes(role);

  const [{ data: cohort }, { data: sessionsData }, { data: recordingsData }] = await Promise.all([
    supabase.from("cohorts").select("id, name").eq("id", cohortId).single(),
    supabase
      .from("class_sessions")
      .select("id, cohort_id, title, description, scheduled_at, duration_minutes, meeting_url, status, created_at")
      .eq("cohort_id", cohortId)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("session_recordings")
      .select("id, cohort_id, session_id, title, description, video_url, file_path, thumbnail_url, published, created_at")
      .eq("cohort_id", cohortId)
      .order("created_at", { ascending: false }),
  ]);

  if (!cohort) notFound();

  const cohortName = cohort.name;
  const sessions: ClassSession[] = (sessionsData ?? []) as ClassSession[];
  const allRecordings = (recordingsData ?? []) as SessionRecording[];
  const recordings = canManage ? allRecordings : allRecordings.filter((r) => r.published);

  const tabs = [
    { key: "home", label: "Home" },
    { key: "modules", label: "Modules" },
    { key: "assignments", label: "Assignments" },
    { key: "classroom", label: "Classroom", href: `/cohorts/${cohortId}/classroom` },
    { key: "grades", label: "Grades" },
    { key: "roster", label: "Roster" },
  ];

  return (
    <PortalPage title={cohortName} description="Online classroom — live sessions and recordings">
      <Link
        href={`/cohorts/${cohortId}`}
        className="mb-2 inline-flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
      >
        <ChevronLeft className="h-4 w-4" /> Back to cohort
      </Link>

      <CohortTabs
        tabs={tabs}
        activeTab="classroom"
        cohortId={cohortId}
        baseHref={`/cohorts/${cohortId}`}
      />

      <ClassroomView
        cohortId={cohortId}
        initialSessions={sessions}
        initialRecordings={recordings}
        canManage={canManage}
      />
    </PortalPage>
  );
}
