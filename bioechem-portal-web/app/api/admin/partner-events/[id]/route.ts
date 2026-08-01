import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

const VALID_TARGETS = ["all", "industry", "government", "specific"];

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updated_at: now };
  if (typeof body.title       === "string") updates.title       = body.title.trim();
  if (typeof body.description === "string") updates.description = body.description.trim() || null;
  if (typeof body.event_date  === "string") updates.event_date  = body.event_date || null;
  if (typeof body.location    === "string") updates.location    = body.location.trim() || null;
  if (typeof body.link        === "string") updates.link        = body.link.trim() || null;
  if (typeof body.published   === "boolean") updates.published  = body.published;
  if (typeof body.target      === "string") {
    if (!VALID_TARGETS.includes(body.target)) return NextResponse.json({ error: "Invalid target." }, { status: 400 });
    const targetPartnerId = typeof body.target_partner_id === "string" ? body.target_partner_id : null;
    if (body.target === "specific" && !targetPartnerId)
      return NextResponse.json({ error: "A specific partner is required for that target." }, { status: 400 });
    updates.target = body.target;
    updates.target_partner_id = body.target === "specific" ? targetPartnerId : null;
  }

  const { data, error } = await auth.supabase
    .from("partner_events")
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
  const { error } = await auth.supabase.from("partner_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
