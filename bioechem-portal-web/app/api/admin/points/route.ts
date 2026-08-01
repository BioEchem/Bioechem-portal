import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

// GET /api/admin/points — leaderboard: all users with total points
export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Service role unavailable" }, { status: 503 });

  const { data, error } = await db
    .from("point_transactions")
    .select("user_id, points");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Aggregate totals per user
  const totals: Record<string, number> = {};
  for (const row of data ?? []) {
    totals[row.user_id] = (totals[row.user_id] ?? 0) + row.points;
  }

  // Fetch profiles for the users that have transactions
  const userIds = Object.keys(totals);
  if (userIds.length === 0) return NextResponse.json({ data: [] });

  const { data: profiles } = await db
    .from("profiles")
    .select("id, first_name, last_name, email, role")
    .in("id", userIds);

  const leaderboard = (profiles ?? [])
    .map((p) => ({
      user_id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email,
      email: p.email,
      role: p.role,
      total_points: totals[p.id] ?? 0,
    }))
    .sort((a, b) => b.total_points - a.total_points);

  return NextResponse.json({ data: leaderboard });
}

// POST /api/admin/points — manually award or deduct points
export async function POST(req: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Service role unavailable" }, { status: 503 });

  const body = await req.json() as Record<string, unknown>;
  const userId = typeof body.user_id === "string" ? body.user_id : null;
  const points = typeof body.points === "number" ? body.points : null;
  const note = typeof body.note === "string" ? body.note.trim() || null : null;
  const cohortId = typeof body.cohort_id === "string" ? body.cohort_id : null;

  if (!userId || points === null || points === 0) {
    return NextResponse.json({ error: "user_id and non-zero points are required" }, { status: 400 });
  }

  const { data, error } = await db
    .from("point_transactions")
    .insert({
      user_id: userId,
      cohort_id: cohortId,
      source: "manual",
      points,
      note: note ?? (points > 0 ? "Manual award" : "Manual deduction"),
      awarded_by: auth.adminUserId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
