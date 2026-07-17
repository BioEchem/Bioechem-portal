import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSession } from "@/lib/auth/session";
import { PortalPage } from "@/components/portal/portal-page";
import { ShareholderDocsTabs } from "@/components/shareholder/shareholder-docs-tabs";

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
  const { supabase, user, profile } = await requireSession({ requireApproved: true });

  if (profile.role !== "shareholder" && profile.role !== "bioechem_admin") {
    return (
      <PortalPage title="Documents">
        <p className="text-sm text-bio-text-muted">You do not have access to this section.</p>
      </PortalPage>
    );
  }

  let query = supabase
    .from("shareholder_documents")
    .select("id, title, description, category, file_name, size_bytes, mime_type, created_at")
    .eq("published", true);

  // Shareholders only see broadcast docs (shared_with null) or docs shared
  // with them specifically; admins see everything.
  if (profile.role !== "bioechem_admin") {
    query = query.or(`shared_with.is.null,shared_with.cs.{${user.id}}`);
  }

  const { data } = await query
    .order("created_at", { ascending: false })
    .returns<DocRow[]>();

  const docs = data ?? [];

  return (
    <PortalPage
      title="Documents"
      description="Reports, financials, and governance materials from BioEChem."
    >
      <Suspense>
        <ShareholderDocsTabs docs={docs} />
      </Suspense>
    </PortalPage>
  );
}
