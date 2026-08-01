import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

const MAX_SIZE = 50 * 1024 * 1024;

export async function POST(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

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

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `docs/${id}/${Date.now()}_${safeName}`;

  // Remove old file if one exists
  const { data: existing } = await auth.supabase
    .from("shareholder_documents")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (existing?.storage_path) {
    await admin.storage.from("shareholder-docs").remove([existing.storage_path]);
  }

  const { error: uploadError } = await admin.storage
    .from("shareholder-docs")
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { error: dbError } = await auth.supabase
    .from("shareholder_documents")
    .update({
      storage_path: storagePath,
      file_name:    file.name,
      size_bytes:   file.size,
      mime_type:    file.type || null,
      updated_at:   new Date().toISOString(),
    })
    .eq("id", id);

  if (dbError) {
    await admin.storage.from("shareholder-docs").remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, file_name: file.name, size_bytes: file.size }, { status: 201 });
}
