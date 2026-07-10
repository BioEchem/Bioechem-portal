import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { PortalPage } from "@/components/portal/portal-page";
import { PartnerDocsList } from "@/components/partner/partner-docs-list";

export const metadata: Metadata = { title: "Documents" };

type DocRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

export default async function PartnerDocsPage() {
  const { supabase, profile } = await requireSession({ requireApproved: true });

  if (profile.role !== "industry_partner" && profile.role !== "bioechem_admin") {
    return (
      <PortalPage title="Documents">
        <p className="text-sm text-bio-text-muted">You do not have access to this section.</p>
      </PortalPage>
    );
  }

  const { data } = await supabase
    .from("partner_documents")
    .select("id, title, description, category, file_name, size_bytes, mime_type, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .returns<DocRow[]>();

  const docs = data ?? [];

  return (
    <PortalPage
      title="Documents"
      description="Impact reports and collateral shared with BioEChem's industry partners."
    >
      <PartnerDocsList docs={docs} />
    </PortalPage>
  );
}
