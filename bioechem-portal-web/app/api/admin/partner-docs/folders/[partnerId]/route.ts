import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ partnerId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { partnerId } = await params;

  const { data: partner, error: partnerError } = await auth.supabase
    .from("profiles")
    .select("id, full_name, email, role, approval_status")
    .eq("id", partnerId)
    .eq("role", "industry_partner")
    .maybeSingle();

  if (partnerError) return NextResponse.json({ error: partnerError.message }, { status: 500 });
  if (!partner) return NextResponse.json({ error: "Partner not found." }, { status: 404 });

  const { data: docs, error } = await auth.supabase
    .from("partner_documents")
    .select("id, title, description, category, file_name, size_bytes, mime_type, created_by, created_at")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: { partner, docs: docs ?? [] } });
}
