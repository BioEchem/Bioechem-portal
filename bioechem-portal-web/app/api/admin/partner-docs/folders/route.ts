import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { data: partners, error } = await auth.supabase
    .from("profiles")
    .select("id, full_name, email, approval_status, partner_type")
    .eq("role", "industry_partner")
    .eq("approval_status", "approved")
    .order("full_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: docs } = await auth.supabase
    .from("partner_documents")
    .select("partner_id")
    .not("partner_id", "is", null);

  const counts = new Map<string, number>();
  for (const d of docs ?? []) {
    if (!d.partner_id) continue;
    counts.set(d.partner_id, (counts.get(d.partner_id) ?? 0) + 1);
  }

  const data = (partners ?? []).map((p) => ({
    ...p,
    doc_count: counts.get(p.id) ?? 0,
  }));

  return NextResponse.json({ data });
}
