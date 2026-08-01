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
  if (typeof body.title   === "string") updates.title   = body.title.trim();
  if (typeof body.date    === "string") updates.date    = body.date;
  if (typeof body.excerpt === "string") updates.excerpt = body.excerpt.trim();
  if (typeof body.body    === "string") updates.body    = body.body.trim() || null;
  if (typeof body.pdf_url === "string") updates.pdf_url = body.pdf_url.trim() || null;
  if (typeof body.published === "boolean") updates.published = body.published;
  if (Array.isArray(body.visible_to)) {
    const VALID_ROLES = ["participant", "teacher", "school_admin", "industry_partner", "shareholder", "bioechem_admin"];
    updates.visible_to = (body.visible_to as unknown[]).filter(
      (r): r is string => typeof r === "string" && VALID_ROLES.includes(r)
    );
  }

  const { data, error } = await auth.supabase
    .from("newsletters")
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
  const { error } = await auth.supabase.from("newsletters").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
