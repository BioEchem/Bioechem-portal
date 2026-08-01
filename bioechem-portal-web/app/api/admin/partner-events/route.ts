import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("partner_events")
    .select("id, title, description, event_date, location, link, published, position, target, target_partner_id, created_at, profiles!target_partner_id(full_name, email)")
    .order("event_date", { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

const VALID_TARGETS = ["all", "industry", "government", "specific"];

export async function POST(req: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json() as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required." }, { status: 400 });

  const target = typeof body.target === "string" ? body.target : "all";
  if (!VALID_TARGETS.includes(target)) return NextResponse.json({ error: "Invalid target." }, { status: 400 });
  const targetPartnerId = typeof body.target_partner_id === "string" ? body.target_partner_id : null;
  if (target === "specific" && !targetPartnerId)
    return NextResponse.json({ error: "A specific partner is required for that target." }, { status: 400 });

  const { data, error } = await auth.supabase
    .from("partner_events")
    .insert({
      title,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      event_date:  typeof body.event_date === "string" ? body.event_date || null : null,
      location:    typeof body.location === "string" ? body.location.trim() || null : null,
      link:        typeof body.link === "string" ? body.link.trim() || null : null,
      published:   body.published !== false,
      target,
      target_partner_id: target === "specific" ? targetPartnerId : null,
      created_by:  auth.adminUserId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
