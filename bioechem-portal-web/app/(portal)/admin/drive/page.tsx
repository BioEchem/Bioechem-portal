import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { PortalPage } from "@/components/portal/portal-page";
import { DriveBrowser } from "@/components/drive/drive-browser";

export const metadata: Metadata = { title: "Drive" };

export default async function AdminDrivePage() {
  await requireSession({ requireApproved: true, requiredRole: "bioechem_admin" });

  return (
    <PortalPage
      title="Drive"
      description="Store and organise documents, folders, and files for BioEChem admin use."
    >
      <DriveBrowser />
    </PortalPage>
  );
}
