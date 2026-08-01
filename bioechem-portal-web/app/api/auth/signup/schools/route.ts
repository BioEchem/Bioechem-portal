import { authError, authOk } from "@/lib/auth/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: schools, error: schoolsError } = await supabase
    .from("schools")
    .select("id, name")
    .order("name");

  if (schoolsError) {
    return authError(schoolsError.message, 500);
  }

  const { data: cohorts, error: cohortsError } = await supabase
    .from("cohorts")
    .select("id, school_id, name")
    .eq("is_active", true)
    .order("name");

  if (cohortsError) {
    return authError(cohortsError.message, 500);
  }

  return authOk({
    schools: (schools ?? []).map((s) => ({ id: s.id, name: s.name })),
    cohorts: (cohorts ?? []).map((c) => ({
      id: c.id,
      schoolId: c.school_id,
      name: c.name,
    })),
  });
}
