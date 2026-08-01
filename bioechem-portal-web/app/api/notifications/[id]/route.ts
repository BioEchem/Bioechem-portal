import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/notifications/[id] — mark a single notification as read
export async function PATCH(_req: Request, { params }: Params) {
  const { supabase, user } = await requireSession({ requireApproved: true });
  const { id } = await params;

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: { ok: true } });
}
