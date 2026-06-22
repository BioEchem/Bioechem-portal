import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updated_at: now };
  if (typeof body.title       === "string") updates.title       = body.title.trim();
  if (typeof body.date        === "string") updates.date        = body.date;
  if (typeof body.location    === "string") updates.location    = body.location.trim();
  if (typeof body.description === "string") updates.description = body.description.trim();
  if (typeof body.link        === "string") updates.link        = body.link.trim() || null;
  if (typeof body.published   === "boolean") updates.published  = body.published;
  if (Array.isArray(body.highlights)) {
    updates.highlights = (body.highlights as unknown[])
      .filter((h): h is string => typeof h === "string" && h.trim() !== "");
  }

  const { data, error } = await auth.supabase
    .from("past_events")
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
  const { error } = await auth.supabase.from("past_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
