import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

export async function GET() {
  const { supabase, user, profile } = await requireSession({ requireApproved: true });

  if (profile.role !== "shareholder" && profile.role !== "bioechem_admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let query = supabase
    .from("shareholder_documents")
    .select("id, title, description, category, file_name, size_bytes, mime_type, created_at")
    .eq("published", true);

  // Shareholders only see broadcast docs (shared_with null) or docs shared
  // with them specifically; admins see everything.
  if (profile.role !== "bioechem_admin") {
    query = query.or(`shared_with.is.null,shared_with.cs.{${user.id}}`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
