import { requireSession } from "@/lib/auth/session";
import { PortalPage, PortalCard } from "@/components/portal/portal-page";
import { NotificationsList } from "@/components/notifications/notifications-list";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { supabase, user } = await requireSession({ requireApproved: true });

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <PortalPage title="Notifications">
      <PortalCard>
        <NotificationsList initialNotifications={notifications ?? []} />
      </PortalCard>
    </PortalPage>
  );
}
