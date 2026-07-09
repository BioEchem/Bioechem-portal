import { requireSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { PortalPage, PortalCard } from "@/components/portal/portal-page";
import { PointsAdmin } from "@/components/admin/points/points-admin";

export const metadata = { title: "Points Management" };

export default async function AdminPointsPage() {
  const { profile } = await requireSession({ requireApproved: true });
  if (profile.role !== "bioechem_admin") redirect("/dashboard");

  const db = createServiceRoleClient();
  if (!db) return <p>Service unavailable</p>;

  // Fetch all transactions
  const { data: txs } = await db
    .from("point_transactions")
    .select("user_id, points");

  // Aggregate per user
  const totals: Record<string, number> = {};
  for (const row of txs ?? []) {
    totals[row.user_id] = (totals[row.user_id] ?? 0) + row.points;
  }

  const userIds = Object.keys(totals);
  let users: { user_id: string; name: string; email: string; role: string; total_points: number }[] = [];

  if (userIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, first_name, last_name, email, role")
      .in("id", userIds);

    users = (profiles ?? [])
      .map((p) => ({
        user_id: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email,
        email: p.email,
        role: p.role,
        total_points: totals[p.id] ?? 0,
      }))
      .sort((a, b) => b.total_points - a.total_points);
  }

  return (
    <PortalPage title="Points Management">
      <PortalCard>
        <PointsAdmin users={users} />
      </PortalCard>
    </PortalPage>
  );
}
