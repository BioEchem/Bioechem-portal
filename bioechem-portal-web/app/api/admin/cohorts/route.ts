import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approval_status, school_id")
    .eq("id", user.id)
    .single();

  const isBioAdmin = profile?.role === "bioechem_admin" && profile?.approval_status === "approved";
  const isSchoolAdmin = profile?.role === "school_admin" && profile?.approval_status === "approved";
  if (!isBioAdmin && !isSchoolAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const schoolId = url.searchParams.get("schoolId");

  let query = supabase
    .from("cohorts")
    .select(`
      id, name, description, school_id, status, is_active,
      start_date, end_date, max_enrollment, enrollment_requires_approval,
      created_at, updated_at,
      schools(id, name)
    `)
    .order("name");

  if (isSchoolAdmin && !isBioAdmin) {
    query = query.eq("school_id", profile.school_id ?? "");
  } else if (schoolId) {
    query = query.eq("school_id", schoolId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approval_status, school_id")
    .eq("id", user.id)
    .single();

  const isBioAdmin = profile?.role === "bioechem_admin" && profile?.approval_status === "approved";
  if (!isBioAdmin) {
    return NextResponse.json({ error: "Only BioEchem admins can create cohorts." }, { status: 403 });
  }

  const body = await request.json() as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const schoolId = typeof body.schoolId === "string" ? body.schoolId || null : null;

  const maxEnrollment = typeof body.maxEnrollment === "number" && body.maxEnrollment > 0
    ? body.maxEnrollment : null;

  const { data, error } = await supabase
    .from("cohorts")
    .insert({
      name,
      school_id: schoolId,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      start_date: typeof body.startDate === "string" ? body.startDate || null : null,
      end_date: typeof body.endDate === "string" ? body.endDate || null : null,
      max_enrollment: maxEnrollment,
      enrollment_requires_approval: body.enrollmentRequiresApproval === true,
      status: typeof body.status === "string" ? body.status : "active",
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
