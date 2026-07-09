import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { PortalPage } from "@/components/portal/portal-page";
import { ShareholderDocsList } from "@/components/shareholder/shareholder-docs-list";

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

export default async function ShareholderDocsPage() {
  const { supabase, profile } = await requireSession({ requireApproved: true });

  if (profile.role !== "shareholder" && profile.role !== "bioechem_admin") {
    return (
      <PortalPage title="Documents">
        <p className="text-sm text-bio-text-muted">You do not have access to this section.</p>
      </PortalPage>
    );
  }

  const { data } = await supabase
    .from("shareholder_documents")
    .select("id, title, description, category, file_name, size_bytes, mime_type, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .returns<DocRow[]>();

  const docs = data ?? [];

  return (
    <PortalPage
      title="Documents"
      description="Reports, financials, and governance materials from BioEChem."
    >
      <ShareholderDocsList docs={docs} />
    </PortalPage>
  );
}
