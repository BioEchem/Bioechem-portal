import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: enrollments } = await supabase
    .from("cohort_enrollments")
    .select("cohort_id")
    .eq("user_id", user.id)
    .eq("status", "approved");

  const cohortIds = (enrollments ?? []).map((e: { cohort_id: string }) => e.cohort_id);

  if (cohortIds.length === 0) return NextResponse.json({ data: [] });

  const { data: surveys, error } = await supabase
    .from("surveys")
    .select("id, title, description, type, status, cohort_id, cohorts(name)")
    .eq("status", "active")
    .in("cohort_id", cohortIds)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: myResponses } = await supabase
    .from("survey_responses")
    .select("survey_id")
    .eq("user_id", user.id);

  const respondedIds = new Set((myResponses ?? []).map((r: { survey_id: string }) => r.survey_id));

  const result = (surveys ?? []).map((s) => ({ ...s, already_responded: respondedIds.has(s.id) }));
  return NextResponse.json({ data: result });
}
