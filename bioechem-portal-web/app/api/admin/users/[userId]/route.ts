import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { PARTNER_TYPES } from "@/lib/partner/folder-categories";

type Params = { params: Promise<{ userId: string }> };

const VALID_PARTNER_TYPES = PARTNER_TYPES.map((t) => t.value);

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { userId } = await params;
  const body = await req.json() as Record<string, unknown>;

  const updates: Record<string, unknown> = {};
  if (body.partnerType === null || VALID_PARTNER_TYPES.includes(body.partnerType as never)) {
    updates.partner_type = body.partnerType;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .eq("role", "industry_partner")
    .select("id, partner_type")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
