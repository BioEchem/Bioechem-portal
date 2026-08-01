import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

// GET /api/certificates/me — signed-in user's own certificates
export async function GET() {
  const { supabase, user, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "approval_status, role",
  });

  // Shareholders and industry partners don't take courses, so certificates don't apply to them
  if (profile.role === "shareholder" || profile.role === "industry_partner") {
    return NextResponse.json({ error: "Certificates are not available for this role." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("certificates")
    .select("id, title, file_url, filename, uploaded_at, cohort_id, cohorts(name)")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data ?? [] });
}
