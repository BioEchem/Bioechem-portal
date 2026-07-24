import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import type { SupabaseServer } from "@/lib/supabase/types";

async function buildBreadcrumb(supabase: SupabaseServer, folderId: string) {
  const path: { id: string; name: string }[] = [];
  let currentId: string | null = folderId;
  while (currentId) {
    const { data: folder }: { data: { id: string; name: string; parent_folder_id: string | null } | null } = await supabase
      .from("partner_folders")
      .select("id, name, parent_folder_id")
      .eq("id", currentId)
      .maybeSingle();
    if (!folder) break;
    path.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parent_folder_id;
  }
  return path;
}

export async function GET(req: Request) {
  const { supabase, user, profile } = await requireSession({ requireApproved: true });

  if (profile.role !== "industry_partner") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const folderId = new URL(req.url).searchParams.get("folder_id");

  if (folderId) {
    const { data: folder } = await supabase
      .from("partner_folders")
      .select("id")
      .eq("id", folderId)
      .eq("partner_id", user.id)
      .maybeSingle();
    if (!folder) return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }

  let foldersQuery = supabase
    .from("partner_folders")
    .select("id, name, created_at")
    .eq("partner_id", user.id)
    .order("name", { ascending: true });
  foldersQuery = folderId ? foldersQuery.eq("parent_folder_id", folderId) : foldersQuery.is("parent_folder_id", null);

  let docsQuery = supabase
    .from("partner_documents")
    .select("id, title, description, category, folder_id, file_name, size_bytes, mime_type, created_by, created_at")
    .eq("partner_id", user.id)
    .order("created_at", { ascending: false });
  docsQuery = folderId ? docsQuery.eq("folder_id", folderId) : docsQuery.is("folder_id", null);

  const [{ data: folders, error: foldersError }, { data: docs, error: docsError }] = await Promise.all([
    foldersQuery,
    docsQuery,
  ]);

  if (foldersError) return NextResponse.json({ error: foldersError.message }, { status: 500 });
  if (docsError) return NextResponse.json({ error: docsError.message }, { status: 500 });

  const breadcrumb = folderId ? await buildBreadcrumb(supabase, folderId) : [];

  return NextResponse.json({ data: { folders: folders ?? [], docs: docs ?? [], breadcrumb } });
}
