import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

// GET /api/notifications — user's 30 most recent notifications
export async function GET(req: Request) {
  const { supabase, user } = await requireSession({ requireApproved: true });

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "true";

  let query = supabase
    .from("notifications")
    .select("id, type, title, body, link, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (unreadOnly) query = query.eq("read", false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data ?? [] });
}
