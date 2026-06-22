import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function assertBioAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role, approval_status").eq("id", user.id).single();
  if (profile?.role !== "bioechem_admin" || profile?.approval_status !== "approved") return null;
  return user;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const user = await assertBioAdmin(supabase);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.description === "string") updates.description = body.description.trim() || null;
  if (typeof body.city === "string") updates.city = body.city.trim() || null;
  if (typeof body.state === "string") updates.state = body.state.trim() || null;
  if (typeof body.country === "string") updates.country = body.country.trim() || null;
  if (typeof body.website === "string") updates.website = body.website.trim() || null;
  if (typeof body.contactEmail === "string") updates.contact_email = body.contactEmail.trim() || null;
  if (typeof body.contactPhone === "string") updates.contact_phone = body.contactPhone.trim() || null;
  if (typeof body.isPartner === "boolean") updates.is_partner = body.isPartner;
  if (typeof body.isActive === "boolean") updates.is_active = body.isActive;

  const { data, error } = await supabase
    .from("schools").update(updates).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const user = await assertBioAdmin(supabase);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { error } = await supabase
    .from("schools").update({ is_active: false }).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
