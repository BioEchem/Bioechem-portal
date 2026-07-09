import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;
  const { supabase, adminUserId } = auth;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("approval_status", "approved")
    .neq("role", "bioechem_admin")
    .neq("id", adminUserId)
    .order("full_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
