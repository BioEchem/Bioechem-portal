import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { PortalPage, PortalCard } from "@/components/portal/portal-page";
import { RewardsView } from "@/components/rewards/rewards-view";

export const metadata = { title: "Rewards" };

export default async function RewardsPage() {
  const { profile } = await requireSession({
    requireApproved: true,
    profileSelect: "role, approval_status",
  });

  if (profile.role === "bioechem_admin") redirect("/admin/points");

  return (
    <PortalPage title="Rewards">
      <PortalCard>
        <RewardsView />
      </PortalCard>
    </PortalPage>
  );
}
