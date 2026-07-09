import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

// GET /api/certificates/me — signed-in user's own certificates
export async function GET() {
  const { supabase, user } = await requireSession({ requireApproved: true });

  const { data, error } = await supabase
    .from("certificates")
    .select("id, title, file_url, filename, uploaded_at, cohort_id, cohorts(name)")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data ?? [] });
}
