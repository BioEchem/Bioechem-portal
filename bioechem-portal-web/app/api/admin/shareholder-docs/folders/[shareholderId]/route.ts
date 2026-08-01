import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import type { SupabaseServer } from "@/lib/supabase/types";

type Params = { params: Promise<{ shareholderId: string }> };

async function buildBreadcrumb(supabase: SupabaseServer, folderId: string) {
  const path: { id: string; name: string }[] = [];
  let currentId: string | null = folderId;
  while (currentId) {
    const { data: folder }: { data: { id: string; name: string; parent_folder_id: string | null } | null } = await supabase
      .from("shareholder_folders")
      .select("id, name, parent_folder_id")
      .eq("id", currentId)
      .maybeSingle();
    if (!folder) break;
    path.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parent_folder_id;
  }
  return path;
}

export async function GET(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { shareholderId } = await params;
  const folderId = new URL(req.url).searchParams.get("folder_id");

  const { data: shareholder, error: shareholderError } = await auth.supabase
    .from("profiles")
    .select("id, full_name, email, role, approval_status")
    .eq("id", shareholderId)
    .eq("role", "shareholder")
    .maybeSingle();

  if (shareholderError) return NextResponse.json({ error: shareholderError.message }, { status: 500 });
  if (!shareholder) return NextResponse.json({ error: "Shareholder not found." }, { status: 404 });

  if (folderId) {
    const { data: folder } = await auth.supabase
      .from("shareholder_folders")
      .select("id")
      .eq("id", folderId)
      .eq("shareholder_id", shareholderId)
      .maybeSingle();
    if (!folder) return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }

  let foldersQuery = auth.supabase
    .from("shareholder_folders")
    .select("id, name, created_at")
    .eq("shareholder_id", shareholderId)
    .order("name", { ascending: true });
  foldersQuery = folderId ? foldersQuery.eq("parent_folder_id", folderId) : foldersQuery.is("parent_folder_id", null);

  let docsQuery = auth.supabase
    .from("shareholder_documents")
    .select("id, title, description, category, folder_id, file_name, size_bytes, mime_type, created_by, created_at")
    .eq("shareholder_id", shareholderId)
    .order("created_at", { ascending: false });
  docsQuery = folderId ? docsQuery.eq("folder_id", folderId) : docsQuery.is("folder_id", null);

  const [{ data: folders, error: foldersError }, { data: docs, error: docsError }] = await Promise.all([
    foldersQuery,
    docsQuery,
  ]);

  if (foldersError) return NextResponse.json({ error: foldersError.message }, { status: 500 });
  if (docsError) return NextResponse.json({ error: docsError.message }, { status: 500 });

  const breadcrumb = folderId ? await buildBreadcrumb(auth.supabase, folderId) : [];

  return NextResponse.json({
    data: { shareholder, folders: folders ?? [], docs: docs ?? [], breadcrumb },
  });
}
