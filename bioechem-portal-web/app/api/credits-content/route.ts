import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

export async function GET() {
  const { supabase } = await requireSession({ requireApproved: true });

  const { data, error } = await supabase
    .from("credits_page_content")
    .select("intro_text, claim_text, actions, updated_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
