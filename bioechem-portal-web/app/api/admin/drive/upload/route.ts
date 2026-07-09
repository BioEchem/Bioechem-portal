import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const MAX_SIZE = 200 * 1024 * 1024; // 200 MB

export async function POST(request: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  const parentId = formData.get("parent_id");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 200 MB)." }, { status: 413 });
  }

  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._\-() ]/g, "_");
  const storagePath = `${auth.adminUserId}/${Date.now()}_${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  let { error: uploadError } = await db.storage
    .from("drive")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  // Auto-create bucket on first use if it doesn't exist
  if (uploadError?.message?.toLowerCase().includes("bucket not found")) {
    await db.storage.createBucket("drive", { public: false });
    const retry = await db.storage.from("drive").upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    uploadError = retry.error;
  }

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data, error: dbError } = await db
    .from("drive_items")
    .insert({
      name: file.name,
      type: "file",
      parent_id: typeof parentId === "string" && parentId ? parentId : null,
      storage_path: storagePath,
      file_url: null, // signed URLs generated on demand via /api/admin/drive/[id]/url
      mime_type: file.type || null,
      size_bytes: file.size,
      created_by: auth.adminUserId,
    })
    .select("id, name, type, parent_id, file_url, mime_type, size_bytes, created_at")
    .single();

  if (dbError) {
    // Clean up uploaded file if DB insert failed
    await db.storage.from("drive").remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
