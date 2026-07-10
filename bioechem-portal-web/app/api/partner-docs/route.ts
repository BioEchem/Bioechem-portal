import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

export async function GET() {
  const { supabase, profile } = await requireSession({ requireApproved: true });

  if (profile.role !== "industry_partner" && profile.role !== "bioechem_admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("partner_documents")
    .select("id, title, description, category, file_name, size_bytes, mime_type, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
