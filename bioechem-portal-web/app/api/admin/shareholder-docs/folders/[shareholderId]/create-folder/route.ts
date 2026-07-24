import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ shareholderId: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { shareholderId } = await params;

  let body: { name?: string; parent_folder_id?: string | null };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Folder name is required." }, { status: 400 });

  const { data: shareholder } = await auth.supabase
    .from("profiles")
    .select("id")
    .eq("id", shareholderId)
    .eq("role", "shareholder")
    .maybeSingle();
  if (!shareholder) return NextResponse.json({ error: "Shareholder not found." }, { status: 404 });

  let parentFolderId: string | null = null;
  if (body.parent_folder_id) {
    const { data: parent } = await auth.supabase
      .from("shareholder_folders")
      .select("id")
      .eq("id", body.parent_folder_id)
      .eq("shareholder_id", shareholderId)
      .maybeSingle();
    if (!parent) return NextResponse.json({ error: "Parent folder not found." }, { status: 404 });
    parentFolderId = parent.id;
  }

  const { data, error } = await auth.supabase
    .from("shareholder_folders")
    .insert({
      shareholder_id: shareholderId,
      parent_folder_id: parentFolderId,
      name,
      created_by: auth.adminUserId,
    })
    .select("id, name, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
