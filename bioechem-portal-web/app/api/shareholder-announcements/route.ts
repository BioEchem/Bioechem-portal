import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

export async function GET() {
  const { supabase, profile } = await requireSession({ requireApproved: true });

  if (profile.role !== "shareholder" && profile.role !== "bioechem_admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // RLS scopes this to announcements addressed to the current shareholder
  // (broadcast, or sent to them specifically).
  const { data, error } = await supabase
    .from("shareholder_announcements")
    .select("id, title, body, target, file_name, size_bytes, mime_type, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
