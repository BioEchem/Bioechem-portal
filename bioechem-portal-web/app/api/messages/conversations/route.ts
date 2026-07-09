import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type RawConv = {
  id: string;
  user_id: string;
  last_message_at: string | null;
  unread_by_admin: boolean;
  unread_by_user: boolean;
  handled_by: string | null;
};

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { data: rawConvs, error } = await supabase
    .from("conversations")
    .select("id, user_id, last_message_at, unread_by_admin, unread_by_user, handled_by")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .returns<RawConv[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const convs = rawConvs ?? [];

  // Collect all profile IDs (conversation owners + handlers)
  const allIds = [...new Set([
    ...convs.map((c) => c.user_id),
    ...convs.map((c) => c.handled_by).filter((id): id is string => !!id),
  ])];

  type ProfileEntry = { full_name: string | null; email: string | null; role: string | null };
  const profileMap = new Map<string, ProfileEntry>();

  if (allIds.length > 0) {
    // Service role so we can see all profiles including other admins
    const adminClient = createServiceRoleClient() ?? supabase;
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, full_name, email, role")
      .in("id", allIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { full_name: p.full_name, email: p.email, role: p.role });
    }
  }

  const data = convs.map((c) => ({
    ...c,
    profiles: profileMap.get(c.user_id) ?? null,
    handler: c.handled_by ? (profileMap.get(c.handled_by) ?? null) : null,
  }));

  return NextResponse.json({ data });
}
