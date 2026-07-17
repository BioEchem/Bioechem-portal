import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approval_status")
    .eq("id", user.id)
    .single();

  const isBioAdmin = profile?.role === "bioechem_admin" && profile?.approval_status === "approved";
  const isSchoolAdmin = profile?.role === "school_admin" && profile?.approval_status === "approved";
  if (!isBioAdmin && !isSchoolAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let query = supabase
    .from("schools")
    .select("id, name, slug, description, city, state, country, website, contact_name, contact_email, contact_phone, is_partner, is_active, created_at")
    .order("name");

  if (isSchoolAdmin && !isBioAdmin) {
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();
    if (adminProfile?.school_id) {
      query = query.eq("id", adminProfile.school_id);
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approval_status")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "bioechem_admin" || profile?.approval_status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const slug = typeof body.slug === "string" && body.slug.trim()
    ? body.slug.trim().toLowerCase().replace(/\s+/g, "-")
    : name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const { data, error } = await supabase
    .from("schools")
    .insert({
      name,
      slug,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      city: typeof body.city === "string" ? body.city.trim() || null : null,
      state: typeof body.state === "string" ? body.state.trim() || null : null,
      country: typeof body.country === "string" ? body.country.trim() || null : null,
      website: typeof body.website === "string" ? body.website.trim() || null : null,
      contact_name: typeof body.contactName === "string" ? body.contactName.trim() || null : null,
      contact_email: typeof body.contactEmail === "string" ? body.contactEmail.trim() || null : null,
      contact_phone: typeof body.contactPhone === "string" ? body.contactPhone.trim() || null : null,
      is_partner: body.isPartner !== false,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
