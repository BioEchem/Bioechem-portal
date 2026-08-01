import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

export async function GET() {
  const { supabase } = await requireSession({ requireApproved: true });

  const { data, error } = await supabase
    .from("job_postings")
    .select("id, title, company, location, type, description, requirements, deadline, visible_to, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
