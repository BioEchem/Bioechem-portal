import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("past_events")
    .select("id, title, date, location, description, highlights, link, published, position, created_at, event_images(id, url, filename, position)")
    .order("date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json() as Record<string, unknown>;
  const title       = typeof body.title       === "string" ? body.title.trim()       : "";
  const date        = typeof body.date        === "string" ? body.date               : "";
  const location    = typeof body.location    === "string" ? body.location.trim()    : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";

  if (!title || !date || !location || !description) {
    return NextResponse.json({ error: "title, date, location, and description are required." }, { status: 400 });
  }

  const highlights = Array.isArray(body.highlights)
    ? (body.highlights as unknown[]).filter((h): h is string => typeof h === "string" && h.trim() !== "")
    : [];

  const { data, error } = await auth.supabase
    .from("past_events")
    .insert({
      title,
      date,
      location,
      description,
      highlights,
      link: typeof body.link === "string" ? body.link.trim() || null : null,
      published: body.published === true,
      created_by: auth.adminUserId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
