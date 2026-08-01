import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { data: shareholders, error } = await auth.supabase
    .from("profiles")
    .select("id, full_name, email, approval_status")
    .eq("role", "shareholder")
    .eq("approval_status", "approved")
    .order("full_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: docs } = await auth.supabase
    .from("shareholder_documents")
    .select("shareholder_id")
    .not("shareholder_id", "is", null);

  const counts = new Map<string, number>();
  for (const d of docs ?? []) {
    if (!d.shareholder_id) continue;
    counts.set(d.shareholder_id, (counts.get(d.shareholder_id) ?? 0) + 1);
  }

  const data = (shareholders ?? []).map((s) => ({
    ...s,
    doc_count: counts.get(s.id) ?? 0,
  }));

  return NextResponse.json({ data });
}
