import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

const VALID_STATUSES = ["active", "upcoming", "completed"];

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updated_at: now };
  if (typeof body.title       === "string") updates.title       = body.title.trim();
  if (typeof body.description === "string") updates.description = body.description.trim() || null;
  if (VALID_STATUSES.includes(body.status as string)) updates.status = body.status;
  if (typeof body.published   === "boolean") updates.published  = body.published;

  const { data, error } = await auth.supabase
    .from("partner_programs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { error } = await auth.supabase.from("partner_programs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
