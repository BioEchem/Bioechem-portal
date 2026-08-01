import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PortalPage } from "@/components/portal/portal-page";
import { JobsBoard } from "@/components/jobs/jobs-board";

export const metadata: Metadata = { title: "Job Postings" };

type JobRow = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  type: string;
  description: string;
  requirements: string | null;
  deadline: string | null;
  created_at: string;
};

type ApplicationRow = {
  job_id: string;
  status: string;
};

export default async function JobsPage() {
  const { supabase, user, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "role, approval_status",
  });

  // Admins manage jobs from their admin panel
  if (profile.role === "bioechem_admin") redirect("/admin/jobs");

  const [jobsResult, appsResult] = await Promise.all([
    supabase
      .from("job_postings")
      .select("id, title, company, location, type, description, requirements, deadline, created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .returns<JobRow[]>(),
    supabase
      .from("job_applications")
      .select("job_id, status")
      .eq("user_id", user.id)
      .returns<ApplicationRow[]>(),
  ]);

  const jobs = jobsResult.data ?? [];
  const applications = appsResult.data ?? [];
  const appliedMap = Object.fromEntries(applications.map((a) => [a.job_id, a.status]));

  return (
    <PortalPage
      title="Job Postings"
      description="Opportunities posted by BioEChem and partner organizations."
    >
      <JobsBoard jobs={jobs} appliedMap={appliedMap} />
    </PortalPage>
  );
}
