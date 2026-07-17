import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

const MAX_SIZE = 50 * 1024 * 1024;

export async function POST(req: Request, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId } = await params;

  const { data: enrollment } = await supabase
    .from("cohort_enrollments")
    .select("role, status")
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (enrollment?.role !== "participant" || enrollment?.status !== "approved") {
    return NextResponse.json({ error: "Only enrolled participants can upload files." }, { status: 403 });
  }

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data." }, { status: 400 }); }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File too large (max 50 MB)." }, { status: 413 });

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  const { data: existing } = await supabase
    .from("career_updates")
    .select("storage_path")
    .eq("cohort_id", cohortId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.storage_path) {
    await admin.storage.from("course-files").remove([existing.storage_path]);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `cohorts/${cohortId}/career-plans/${user.id}_${Date.now()}_${safeName}`;

  const { error: uploadError } = await admin.storage
    .from("course-files")
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("course-files").getPublicUrl(storagePath);

  const { data, error: dbError } = await supabase
    .from("career_updates")
    .upsert(
      {
        cohort_id: cohortId,
        user_id: user.id,
        file_url: publicUrl,
        storage_path: storagePath,
        file_name: file.name,
        size_bytes: file.size,
        mime_type: file.type || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cohort_id,user_id" },
    )
    .select("id, content, file_url, file_name, size_bytes, mime_type, updated_at")
    .single();

  if (dbError) {
    await admin.storage.from("course-files").remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
