import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { PortalPage, PortalCard } from "@/components/portal/portal-page";
import { MyCertificates } from "@/components/certificates/my-certificates";

export const metadata = { title: "My Certificates" };

export default async function CertificatesPage() {
  const { supabase, user, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "role, approval_status",
  });

  // Admins issue certificates from each cohort's admin page
  if (profile.role === "bioechem_admin") redirect("/admin/cohorts");

  const { data: raw } = await supabase
    .from("certificates")
    .select("id, title, file_url, filename, uploaded_at, cohort_id, cohorts(name)")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false });

  const certs = (raw ?? []).map((c) => ({
    ...c,
    cohorts: Array.isArray(c.cohorts) ? (c.cohorts[0] ?? null) : c.cohorts,
  }));

  return (
    <PortalPage title="My Certificates">
      <PortalCard>
        <MyCertificates initialCerts={certs} />
      </PortalCard>
    </PortalPage>
  );
}
