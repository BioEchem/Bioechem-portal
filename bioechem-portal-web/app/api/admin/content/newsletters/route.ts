import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("newsletters")
    .select("id, title, date, excerpt, body, pdf_url, video_url, visible_to, published, position, created_at")
    .order("date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json() as Record<string, unknown>;
  const title   = typeof body.title   === "string" ? body.title.trim()   : "";
  const date    = typeof body.date    === "string" ? body.date            : "";
  const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim()  : "";

  if (!title || !date || !excerpt) {
    return NextResponse.json({ error: "title, date, and excerpt are required." }, { status: 400 });
  }

  const VALID_ROLES = ["participant", "teacher", "school_admin", "industry_partner", "shareholder", "bioechem_admin"];
  const visibleTo: string[] = Array.isArray(body.visible_to)
    ? (body.visible_to as unknown[]).filter((r): r is string => typeof r === "string" && VALID_ROLES.includes(r))
    : [];

  const { data, error } = await auth.supabase
    .from("newsletters")
    .insert({
      title,
      date,
      excerpt,
      body:       typeof body.body    === "string" ? body.body.trim()    || null : null,
      pdf_url:    typeof body.pdf_url === "string" ? body.pdf_url.trim() || null : null,
      published:  body.published === true,
      visible_to: visibleTo,
      created_by: auth.adminUserId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
