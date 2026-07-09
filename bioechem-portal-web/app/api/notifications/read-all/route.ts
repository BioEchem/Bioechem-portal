import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

// POST /api/notifications/read-all — mark all user notifications as read
export async function POST() {
  const { supabase, user } = await requireSession({ requireApproved: true });

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: { ok: true } });
}
