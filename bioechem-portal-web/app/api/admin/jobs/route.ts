import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

const VALID_TYPES = ["full-time", "part-time", "internship", "contract"];
const VALID_ROLES = ["participant", "teacher", "school_admin", "industry_partner", "shareholder", "bioechem_admin"];

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("job_postings")
    .select("id, title, company, location, type, description, requirements, deadline, visible_to, published, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json() as Record<string, unknown>;
  const title       = typeof body.title       === "string" ? body.title.trim()       : "";
  const company     = typeof body.company     === "string" ? body.company.trim()     : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";

  if (!title || !company || !description) {
    return NextResponse.json({ error: "title, company, and description are required." }, { status: 400 });
  }

  const type = VALID_TYPES.includes(body.type as string) ? (body.type as string) : "full-time";
  const visibleTo: string[] = Array.isArray(body.visible_to)
    ? (body.visible_to as unknown[]).filter((r): r is string => typeof r === "string" && VALID_ROLES.includes(r))
    : [];

  const { data, error } = await auth.supabase
    .from("job_postings")
    .insert({
      title,
      company,
      location:     typeof body.location     === "string" ? body.location.trim()     || null : null,
      type,
      description,
      requirements: typeof body.requirements === "string" ? body.requirements.trim() || null : null,
      deadline:     typeof body.deadline     === "string" ? body.deadline             || null : null,
      visible_to:   visibleTo,
      published:    body.published === true,
      created_by:   auth.adminUserId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
