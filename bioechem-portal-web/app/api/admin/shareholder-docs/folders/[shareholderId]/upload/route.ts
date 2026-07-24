import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ shareholderId: string }> };

const MAX_SIZE = 50 * 1024 * 1024;
const CATEGORY = "other";

export async function POST(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { shareholderId } = await params;

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data." }, { status: 400 }); }

  const file = formData.get("file");
  const title = formData.get("title");
  const folderId = formData.get("folder_id");

  if (!(file instanceof File) || file.size === 0)
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File too large (max 50 MB)." }, { status: 413 });

  const { data: shareholder } = await auth.supabase
    .from("profiles")
    .select("id")
    .eq("id", shareholderId)
    .eq("role", "shareholder")
    .maybeSingle();
  if (!shareholder) return NextResponse.json({ error: "Shareholder not found." }, { status: 404 });

  let resolvedFolderId: string | null = null;
  if (typeof folderId === "string" && folderId.length > 0) {
    const { data: folder } = await auth.supabase
      .from("shareholder_folders")
      .select("id")
      .eq("id", folderId)
      .eq("shareholder_id", shareholderId)
      .maybeSingle();
    if (!folder) return NextResponse.json({ error: "Folder not found." }, { status: 404 });
    resolvedFolderId = folder.id;
  }

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `shareholders/${shareholderId}/${CATEGORY}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await admin.storage
    .from("shareholder-docs")
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data, error: dbError } = await auth.supabase
    .from("shareholder_documents")
    .insert({
      shareholder_id: shareholderId,
      title: typeof title === "string" && title.trim() ? title.trim() : file.name,
      category: CATEGORY,
      folder_id: resolvedFolderId,
      published: true,
      storage_path: storagePath,
      file_name: file.name,
      size_bytes: file.size,
      mime_type: file.type || null,
      created_by: auth.adminUserId,
    })
    .select("id, title, description, category, folder_id, file_name, size_bytes, mime_type, created_by, created_at")
    .single();

  if (dbError) {
    await admin.storage.from("shareholder-docs").remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
