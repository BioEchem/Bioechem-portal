import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

// GET /api/points/me — signed-in user's point total and history
export async function GET() {
  const { supabase, user } = await requireSession({ requireApproved: true });

  const { data, error } = await supabase
    .from("point_transactions")
    .select("id, source, cohort_id, points, note, created_at, cohorts(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const total = (data ?? []).reduce((sum, row) => sum + row.points, 0);
  return NextResponse.json({ data: { total, transactions: data ?? [] } });
}
