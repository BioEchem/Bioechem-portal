import { createServiceRoleClient } from "@/lib/supabase/admin";

type NotificationType = "grade" | "certificate" | "job_application" | "announcement" | "general";

/** Fetches all bioechem_admin user IDs and sends them a notification. */
export async function notifyAllAdmins({
  type,
  title,
  body,
  link,
}: {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  const db = createServiceRoleClient();
  if (!db) return;
  const { data: admins } = await db
    .from("profiles")
    .select("id")
    .eq("role", "bioechem_admin");
  if (!admins || admins.length === 0) return;
  await db.from("notifications").insert(
    admins.map((a) => ({
      user_id: a.id,
      type,
      title,
      body: body ?? null,
      link: link ?? null,
    }))
  );
}

export async function createNotification({
  userId,
  type,
  title,
  body,
  link,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  const db = createServiceRoleClient();
  if (!db) return;
  await db.from("notifications").insert({ user_id: userId, type, title, body: body ?? null, link: link ?? null });
}

export async function createNotifications(
  rows: { userId: string; type: NotificationType; title: string; body?: string; link?: string }[]
) {
  if (rows.length === 0) return;
  const db = createServiceRoleClient();
  if (!db) return;
  await db.from("notifications").insert(
    rows.map((r) => ({
      user_id: r.userId,
      type: r.type,
      title: r.title,
      body: r.body ?? null,
      link: r.link ?? null,
    }))
  );
}
