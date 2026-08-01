import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { PortalPage, PortalCard } from "@/components/portal/portal-page";
import { CreditsAdmin } from "@/components/admin/credits/credits-admin";

export const metadata = { title: "Credits Management" };

export default async function AdminCreditsPage() {
  const { profile } = await requireSession({ requireApproved: true });
  if (profile.role !== "bioechem_admin") redirect("/dashboard");

  const db = createServiceRoleClient();
  if (!db) return <p>Service unavailable</p>;

  const [{ data: profiles }, { data: notes }] = await Promise.all([
    db
      .from("profiles")
      .select("id, first_name, last_name, email, role")
      .eq("approval_status", "approved")
      .order("first_name"),
    // Newest first, per user_id — take the first row seen per user below to get the latest.
    db.from("user_credit_notes").select("user_id, note, created_at").order("created_at", { ascending: false }),
  ]);

  const latestNoteByUser = new Map<string, { note: string | null; created_at: string }>();
  for (const n of notes ?? []) {
    const uid = n.user_id as string;
    if (!latestNoteByUser.has(uid)) {
      latestNoteByUser.set(uid, { note: n.note as string | null, created_at: n.created_at as string });
    }
  }

  const users = (profiles ?? []).map((p) => ({
    userId: p.id as string,
    name: [p.first_name, p.last_name].filter(Boolean).join(" ") || (p.email as string),
    email: p.email as string,
    role: p.role as string,
    note: latestNoteByUser.get(p.id as string)?.note ?? null,
    updatedAt: latestNoteByUser.get(p.id as string)?.created_at ?? null,
  }));

  return (
    <PortalPage
      title="Credits Management"
      description="Manually track each user's credits"
    >
      <PortalCard>
        <CreditsAdmin users={users} />
      </PortalCard>
    </PortalPage>
  );
}
