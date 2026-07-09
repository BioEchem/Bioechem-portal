import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emailUsersNewAnnouncement } from "@/lib/notify/user-email";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId } = await params;

  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, is_pinned, published, created_at, updated_at, profiles(full_name, avatar_url)")
    .eq("cohort_id", cohortId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId } = await params;

  // Must be teacher in cohort, school admin, or bioechem admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approval_status, school_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.approval_status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isBioAdmin = profile.role === "bioechem_admin";
  const isSchoolAdmin = profile.role === "school_admin";
  let canPost = isBioAdmin;

  if (!canPost && isSchoolAdmin && profile.school_id) {
    const { data: cohort } = await supabase
      .from("cohorts").select("school_id").eq("id", cohortId).single();
    canPost = cohort?.school_id === profile.school_id;
  }

  if (!canPost) {
    const { data: enrollment } = await supabase
      .from("cohort_enrollments")
      .select("id")
      .eq("cohort_id", cohortId)
      .eq("user_id", user.id)
      .eq("role", "teacher")
      .eq("status", "approved")
      .maybeSingle();
    canPost = !!enrollment;
  }

  if (!canPost) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.body === "string" ? body.body.trim() : "";
  if (!title || !content) {
    return NextResponse.json({ error: "Title and body are required." }, { status: 400 });
  }

  const VALID_ROLES = ["participant", "teacher", "school_admin", "industry_partner", "shareholder", "bioechem_admin"];
  const visibleTo: string[] = Array.isArray(body.visible_to)
    ? (body.visible_to as unknown[]).filter((r): r is string => typeof r === "string" && VALID_ROLES.includes(r))
    : [];

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      cohort_id: cohortId,
      author_id: user.id,
      title,
      body: content,
      is_pinned: body.isPinned === true,
      published: body.published !== false,
      visible_to: visibleTo,
    })
    .select("id, title, body, is_pinned, published, visible_to, created_at, profiles(full_name, avatar_url)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Notify enrolled participants (fire-and-forget)
  if (data.published) {
    Promise.all([
      supabase.from("cohorts").select("title").eq("id", cohortId).single(),
      supabase
        .from("cohort_enrollments")
        .select("profiles(email, full_name)")
        .eq("cohort_id", cohortId)
        .eq("role", "participant")
        .eq("status", "approved"),
    ]).then(([cohortRes, enrollRes]) => {
      const cohortName = cohortRes.data?.title ?? "your cohort";
      const recipients = (enrollRes.data ?? []).flatMap((e) => {
        const p = e.profiles as unknown as { email: string | null; full_name: string | null } | null;
        return p?.email ? [{ email: p.email, name: p.full_name ?? p.email }] : [];
      });
      if (recipients.length > 0) {
        emailUsersNewAnnouncement(recipients, cohortName, title, cohortId);
      }
    }).catch(() => {});
  }

  return NextResponse.json({ data }, { status: 201 });
}
