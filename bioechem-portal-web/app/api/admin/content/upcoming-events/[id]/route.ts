import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title       === "string") patch.title       = body.title.trim();
  if (typeof body.date        === "string") patch.date        = body.date;
  if (typeof body.location    === "string") patch.location    = body.location.trim();
  if (typeof body.description === "string") patch.description = body.description.trim();
  if (typeof body.link        === "string") patch.link        = body.link.trim() || null;
  if (body.link === null)                   patch.link        = null;
  if (typeof body.published   === "boolean") patch.published  = body.published;
  if (typeof body.position    === "number")  patch.position   = body.position;

  const { data, error } = await auth.supabase
    .from("upcoming_events")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { error } = await auth.supabase.from("upcoming_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return new NextResponse(null, { status: 204 });
}
