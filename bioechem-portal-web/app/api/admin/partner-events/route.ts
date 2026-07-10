import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("partner_events")
    .select("id, title, description, event_date, location, link, published, position, created_at")
    .order("event_date", { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json() as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required." }, { status: 400 });

  const { data, error } = await auth.supabase
    .from("partner_events")
    .insert({
      title,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      event_date:  typeof body.event_date === "string" ? body.event_date || null : null,
      location:    typeof body.location === "string" ? body.location.trim() || null : null,
      link:        typeof body.link === "string" ? body.link.trim() || null : null,
      published:   body.published !== false,
      created_by:  auth.adminUserId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
