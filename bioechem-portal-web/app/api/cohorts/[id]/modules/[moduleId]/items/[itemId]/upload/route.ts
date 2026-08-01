import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string; moduleId: string; itemId: string }> };

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB (matches bucket limit)

export async function POST(req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId, moduleId, itemId } = await params;

  const { data: profile } = await supabase.from("profiles").select("role, approval_status").eq("id", user.id).single();
  if (!profile || profile.approval_status !== "approved") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let canManage = profile.role === "bioechem_admin";
  if (!canManage) {
    const { data: e } = await supabase.from("cohort_enrollments")
      .select("role, status").eq("cohort_id", cohortId).eq("user_id", user.id).maybeSingle();
    canManage = e?.role === "teacher" && e?.status === "approved";
  }
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 50 MB)." }, { status: 413 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `cohorts/${cohortId}/modules/${moduleId}/items/${itemId}/${Date.now()}_${safeName}`;

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Storage not configured." }, { status: 500 });
  }

  const { error: uploadError } = await admin.storage
    .from("course-files")
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from("course-files").getPublicUrl(path);

  const { data, error: dbError } = await supabase
    .from("module_items")
    .update({ file_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("cohort_id", cohortId)
    .select("id, file_url")
    .single();

  if (dbError) {
    await admin.storage.from("course-files").remove([path]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { ...data, filename: file.name } }, { status: 201 });
}
