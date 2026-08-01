import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

const VALID_TYPES = ["full-time", "part-time", "internship", "contract"];
const VALID_ROLES = ["participant", "teacher", "school_admin", "industry_partner", "shareholder", "bioechem_admin"];

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updated_at: now };
  if (typeof body.title       === "string") updates.title       = body.title.trim();
  if (typeof body.company     === "string") updates.company     = body.company.trim();
  if (typeof body.location    === "string") updates.location    = body.location.trim()    || null;
  if (typeof body.description === "string") updates.description = body.description.trim();
  if (typeof body.requirements=== "string") updates.requirements= body.requirements.trim()|| null;
  if (typeof body.deadline    === "string") updates.deadline    = body.deadline            || null;
  if (typeof body.published   === "boolean") updates.published  = body.published;
  if (VALID_TYPES.includes(body.type as string)) updates.type   = body.type;
  if (Array.isArray(body.visible_to)) {
    updates.visible_to = (body.visible_to as unknown[]).filter(
      (r): r is string => typeof r === "string" && VALID_ROLES.includes(r)
    );
  }

  const { data, error } = await auth.supabase
    .from("job_postings")
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
  const { error } = await auth.supabase.from("job_postings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
