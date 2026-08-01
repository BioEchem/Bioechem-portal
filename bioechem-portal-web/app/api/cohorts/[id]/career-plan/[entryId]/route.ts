import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

type Params = { params: Promise<{ id: string; entryId: string }> };

async function canManageCohort(supabase: Awaited<ReturnType<typeof createClient>>, cohortId: string, userId: string) {
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (profile?.role === "bioechem_admin" || profile?.role === "school_admin") return true;
  const { data: enrollment } = await supabase
    .from("cohort_enrollments")
    .select("role, status")
    .eq("cohort_id", cohortId)
    .eq("user_id", userId)
    .maybeSingle();
  return enrollment?.role === "teacher" && enrollment?.status === "approved";
}

// PATCH: either the owning participant edits their entry's content, or a
// manager (teacher/admin) sets a comment on it — determined by which field(s)
// are present in the body.
export async function PATCH(req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId, entryId } = await params;

  const { data: entry } = await supabase
    .from("career_updates")
    .select("id, user_id, cohort_id")
    .eq("id", entryId)
    .eq("cohort_id", cohortId)
    .maybeSingle();
  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  const body = await req.json() as { content?: unknown; admin_comment?: unknown };
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.content === "string") {
    if (entry.user_id !== user.id) {
      return NextResponse.json({ error: "You can only edit your own entry." }, { status: 403 });
    }
    updates.content = body.content.trim() || null;
  }

  let notifyComment: string | null = null;
  if (typeof body.admin_comment === "string") {
    if (!(await canManageCohort(supabase, cohortId, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const adminComment = body.admin_comment.trim();
    updates.admin_comment = adminComment || null;
    updates.commented_by = user.id;
    updates.commented_at = new Date().toISOString();
    notifyComment = adminComment || null;
  }

  // Teachers have no RLS SELECT policy on other users' `profiles` rows, so
  // the embedded profile in this join would silently come back null for
  // them — use the service-role client for the return payload (the update
  // itself already went through the RLS-bound client above).
  const returnClient = createServiceRoleClient() ?? supabase;
  const { data, error } = await returnClient
    .from("career_updates")
    .update(updates)
    .eq("id", entryId)
    .select("id, user_id, content, file_url, file_name, size_bytes, mime_type, admin_comment, commented_at, created_at, updated_at, profiles!user_id(full_name, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (notifyComment) {
    await createNotification({
      userId: entry.user_id,
      type: "general",
      title: "New comment on your career path",
      body: notifyComment.slice(0, 120),
      link: `/cohorts/${cohortId}?tab=career_path`,
    });
  }

  return NextResponse.json({ data });
}

// DELETE: the owning participant removes one of their own entries (and its attached file, if any).
export async function DELETE(_req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId, entryId } = await params;

  const { data: entry } = await supabase
    .from("career_updates")
    .select("id, user_id, storage_path")
    .eq("id", entryId)
    .eq("cohort_id", cohortId)
    .maybeSingle();
  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  if (entry.user_id !== user.id) {
    return NextResponse.json({ error: "You can only delete your own entry." }, { status: 403 });
  }

  const { error } = await supabase.from("career_updates").delete().eq("id", entryId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (entry.storage_path) {
    const admin = createServiceRoleClient();
    if (admin) await admin.storage.from("course-files").remove([entry.storage_path]);
  }

  return NextResponse.json({ ok: true });
}
