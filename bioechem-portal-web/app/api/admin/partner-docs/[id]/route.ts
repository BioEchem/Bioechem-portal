import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

const VALID_CATEGORIES = ["general", "report", "impact"];

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updated_at: now };
  if (typeof body.title       === "string") updates.title       = body.title.trim();
  if (typeof body.description === "string") updates.description = body.description.trim() || null;
  if (VALID_CATEGORIES.includes(body.category as string)) updates.category = body.category;
  if (typeof body.published   === "boolean") updates.published  = body.published;

  const { data, error } = await auth.supabase
    .from("partner_documents")
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
  const admin = createServiceRoleClient();

  const { data: doc } = await auth.supabase
    .from("partner_documents")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (doc?.storage_path && admin) {
    await admin.storage.from("partner-docs").remove([doc.storage_path]);
  }

  const { error } = await auth.supabase.from("partner_documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
