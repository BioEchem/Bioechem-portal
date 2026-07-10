import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

const VALID_STATUSES = ["active", "upcoming", "completed"];

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("partner_programs")
    .select("id, title, description, status, published, position, created_at")
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json() as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required." }, { status: 400 });

  const status = VALID_STATUSES.includes(body.status as string) ? (body.status as string) : "active";

  const { data, error } = await auth.supabase
    .from("partner_programs")
    .insert({
      title,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      status,
      published:   body.published !== false,
      created_by:  auth.adminUserId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
