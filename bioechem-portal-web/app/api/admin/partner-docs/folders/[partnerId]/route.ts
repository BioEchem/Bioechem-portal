import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import type { SupabaseServer } from "@/lib/supabase/types";

type Params = { params: Promise<{ partnerId: string }> };

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

export async function GET(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { partnerId } = await params;
  const folderId = new URL(req.url).searchParams.get("folder_id");

  const { data: partner, error: partnerError } = await auth.supabase
    .from("profiles")
    .select("id, full_name, email, role, approval_status")
    .eq("id", partnerId)
    .eq("role", "industry_partner")
    .maybeSingle();

  if (partnerError) return NextResponse.json({ error: partnerError.message }, { status: 500 });
  if (!partner) return NextResponse.json({ error: "Partner not found." }, { status: 404 });

  if (folderId) {
    const { data: folder } = await auth.supabase
      .from("partner_folders")
      .select("id")
      .eq("id", folderId)
      .eq("partner_id", partnerId)
      .maybeSingle();
    if (!folder) return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }

  let foldersQuery = auth.supabase
    .from("partner_folders")
    .select("id, name, created_at")
    .eq("partner_id", partnerId)
    .order("name", { ascending: true });
  foldersQuery = folderId ? foldersQuery.eq("parent_folder_id", folderId) : foldersQuery.is("parent_folder_id", null);

  let docsQuery = auth.supabase
    .from("partner_documents")
    .select("id, title, description, category, folder_id, file_name, size_bytes, mime_type, created_by, created_at")
    .eq("partner_id", partnerId)
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
    data: { partner, folders: folders ?? [], docs: docs ?? [], breadcrumb },
  });
}
