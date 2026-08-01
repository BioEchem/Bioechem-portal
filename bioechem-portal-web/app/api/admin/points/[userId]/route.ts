import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ userId: string }> };

// GET /api/admin/points/[userId] — transaction history for one user
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { userId } = await params;
  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Service role unavailable" }, { status: 503 });

  const { data, error } = await db
    .from("point_transactions")
    .select("id, source, cohort_id, points, note, created_at, cohorts(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

// DELETE /api/admin/points/[userId] — delete a specific transaction (by transaction id in body)
export async function DELETE(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { userId } = await params;
  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Service role unavailable" }, { status: 503 });

  const body = await req.json() as Record<string, unknown>;
  const txId = typeof body.transaction_id === "string" ? body.transaction_id : null;
  if (!txId) return NextResponse.json({ error: "transaction_id required" }, { status: 400 });

  const { error } = await db
    .from("point_transactions")
    .delete()
    .eq("id", txId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: { deleted: true } });
}
