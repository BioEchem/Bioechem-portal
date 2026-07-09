import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

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

  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Only MP4, WebM, OGG, or MOV video files are allowed." }, { status: 400 });

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File too large (max 100 MB)." }, { status: 413 });

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `newsletters/${id}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await admin.storage
    .from("newsletter-videos")
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("newsletter-videos").getPublicUrl(path);

  const { error: dbError } = await auth.supabase
    .from("newsletters")
    .update({ video_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (dbError) {
    await admin.storage.from("newsletter-videos").remove([path]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ url: publicUrl, filename: file.name }, { status: 201 });
}

export async function DELETE(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  // Get current video_url to find storage path
  const { data: newsletter } = await auth.supabase
    .from("newsletters")
    .select("video_url")
    .eq("id", id)
    .single();

  if (newsletter?.video_url) {
    // Extract path from public URL
    const match = newsletter.video_url.match(/newsletter-videos\/(.+)$/);
    if (match) {
      await admin.storage.from("newsletter-videos").remove([match[1]]);
    }
  }

  await auth.supabase
    .from("newsletters")
    .update({ video_url: null, updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
