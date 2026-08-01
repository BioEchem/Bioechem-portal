import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ shareholderId: string; folderId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { shareholderId, folderId } = await params;

  const { data: folder } = await auth.supabase
    .from("shareholder_folders")
    .select("id")
    .eq("id", folderId)
    .eq("shareholder_id", shareholderId)
    .maybeSingle();
  if (!folder) return NextResponse.json({ error: "Folder not found." }, { status: 404 });

  const [{ count: subfolderCount }, { count: docCount }] = await Promise.all([
    auth.supabase.from("shareholder_folders").select("id", { count: "exact", head: true }).eq("parent_folder_id", folderId),
    auth.supabase.from("shareholder_documents").select("id", { count: "exact", head: true }).eq("folder_id", folderId),
  ]);

  if ((subfolderCount ?? 0) > 0 || (docCount ?? 0) > 0) {
    return NextResponse.json({ error: "Folder is not empty." }, { status: 409 });
  }

  const { error } = await auth.supabase.from("shareholder_folders").delete().eq("id", folderId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: { ok: true } });
}
