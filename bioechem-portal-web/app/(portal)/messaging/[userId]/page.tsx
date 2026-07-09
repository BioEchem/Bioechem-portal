import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";

// Legacy route — redirect to the new split-pane URL pattern
export default async function AdminUserConversationRedirect({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { profile } = await requireSession({ requireApproved: true });
  if (profile.role !== "bioechem_admin") redirect("/messaging");
  const { userId } = await params;
  redirect(`/messaging?user=${userId}`);
}
