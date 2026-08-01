import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ userId: string }> };

// GET /api/admin/credits/[userId] — full history of credit notes for one user, newest first.
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { userId } = await params;
  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Service role unavailable" }, { status: 503 });

  const { data, error } = await db
    .from("user_credit_notes")
    .select("id, note, created_at, profiles!created_by(full_name, email)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

// POST /api/admin/credits/[userId] — record a new credits note entry (append-only; doesn't overwrite prior entries).
export async function POST(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { userId } = await params;
  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Service role unavailable" }, { status: 503 });

  const body = await req.json() as Record<string, unknown>;
  const note = typeof body.note === "string" ? body.note.trim() : "";

  const { data, error } = await db
    .from("user_credit_notes")
    .insert({ user_id: userId, note: note || null, created_by: auth.adminUserId })
    .select("id, note, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
