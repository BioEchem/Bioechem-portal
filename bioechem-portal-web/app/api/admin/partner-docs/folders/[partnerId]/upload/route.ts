import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { PARTNER_FOLDER_CATEGORY_VALUES } from "@/lib/partner/folder-categories";

type Params = { params: Promise<{ partnerId: string }> };

const MAX_SIZE = 50 * 1024 * 1024;

export async function POST(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { partnerId } = await params;

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data." }, { status: 400 }); }

  const file = formData.get("file");
  const category = formData.get("category");
  const title = formData.get("title");

  if (!(file instanceof File) || file.size === 0)
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File too large (max 50 MB)." }, { status: 413 });
  if (typeof category !== "string" || !PARTNER_FOLDER_CATEGORY_VALUES.includes(category as never))
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });

  const { data: partner } = await auth.supabase
    .from("profiles")
    .select("id")
    .eq("id", partnerId)
    .eq("role", "industry_partner")
    .maybeSingle();
  if (!partner) return NextResponse.json({ error: "Partner not found." }, { status: 404 });

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `partners/${partnerId}/${category}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await admin.storage
    .from("partner-docs")
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data, error: dbError } = await auth.supabase
    .from("partner_documents")
    .insert({
      partner_id: partnerId,
      title: typeof title === "string" && title.trim() ? title.trim() : file.name,
      category,
      published: true,
      storage_path: storagePath,
      file_name: file.name,
      size_bytes: file.size,
      mime_type: file.type || null,
      created_by: auth.adminUserId,
    })
    .select("id, title, description, category, file_name, size_bytes, mime_type, created_by, created_at")
    .single();

  if (dbError) {
    await admin.storage.from("partner-docs").remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
