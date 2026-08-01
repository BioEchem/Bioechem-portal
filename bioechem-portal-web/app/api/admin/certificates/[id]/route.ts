import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;
  const { id } = await params;

  // Get file_url first so we can delete from storage
  const { data: cert } = await supabase
    .from("certificates")
    .select("file_url")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("certificates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Best-effort storage cleanup
  if (cert?.file_url) {
    const url = new URL(cert.file_url);
    const pathParts = url.pathname.split("/storage/v1/object/public/certificates/");
    if (pathParts[1]) {
      await supabase.storage.from("certificates").remove([pathParts[1]]);
    }
  }

  return NextResponse.json({ data: null });
}
