import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string; entryId: string }> };

const MAX_SIZE = 50 * 1024 * 1024;

export async function POST(req: Request, { params }: Params) {
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

  if (!entry || entry.user_id !== user.id) {
    return NextResponse.json({ error: "Only the entry's owner can attach a file." }, { status: 403 });
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

  if (entry.storage_path) {
    await admin.storage.from("course-files").remove([entry.storage_path]);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `cohorts/${cohortId}/career-plans/${user.id}_${entryId}_${Date.now()}_${safeName}`;

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
    .update({
      file_url: publicUrl,
      storage_path: storagePath,
      file_name: file.name,
      size_bytes: file.size,
      mime_type: file.type || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .select("id, content, file_url, file_name, size_bytes, mime_type, admin_comment, commented_at, created_at, updated_at")
    .single();

  if (dbError) {
    await admin.storage.from("course-files").remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
