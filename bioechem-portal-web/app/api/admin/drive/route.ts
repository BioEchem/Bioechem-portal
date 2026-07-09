import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

// GET /api/admin/drive?parent_id=<uuid|null>  — list items in a folder
export async function GET(request: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get("parent_id") || null;

  const query = db
    .from("drive_items")
    .select("id, name, type, parent_id, file_url, mime_type, size_bytes, created_at, updated_at, profiles!created_by(full_name, email)")
    .order("type", { ascending: true })  // folders first
    .order("name", { ascending: true });

  if (parentId) {
    query.eq("parent_id", parentId);
  } else {
    query.is("parent_id", null);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
}

// POST /api/admin/drive — create a folder
export async function POST(request: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json() as { name?: string; parent_id?: string | null };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Folder name is required." }, { status: 400 });

  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  const { data, error } = await db
    .from("drive_items")
    .insert({
      name,
      type: "folder",
      parent_id: body.parent_id ?? null,
      created_by: auth.adminUserId,
    })
    .select("id, name, type, parent_id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
