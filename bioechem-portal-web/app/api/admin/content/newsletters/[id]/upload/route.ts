import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

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

  if (file.type !== "application/pdf")
    return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });

  if (file.size > 20 * 1024 * 1024)
    return NextResponse.json({ error: "File too large (max 20 MB)." }, { status: 413 });

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `newsletters/${id}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await admin.storage
    .from("newsletter-files")
    .upload(path, await file.arrayBuffer(), {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("newsletter-files").getPublicUrl(path);

  // Update the newsletter record with the new pdf_url
  await auth.supabase
    .from("newsletters")
    .update({ pdf_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ url: publicUrl, filename: file.name }, { status: 201 });
}
