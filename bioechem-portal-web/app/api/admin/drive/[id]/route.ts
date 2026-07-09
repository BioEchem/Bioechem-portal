import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/drive/[id] — rename an item
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json() as { name?: string };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  const { data, error } = await db
    .from("drive_items")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// DELETE /api/admin/drive/[id] — delete item (and storage file if it's a file)
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  // Fetch the item first to get storage_path
  const { data: item } = await db
    .from("drive_items")
    .select("id, type, storage_path")
    .eq("id", id)
    .single();

  if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  // If it's a file, delete from storage first
  if (item.type === "file" && item.storage_path) {
    await db.storage.from("drive").remove([item.storage_path]);
  }

  // Delete DB row (cascade deletes children for folders)
  const { error } = await db.from("drive_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: null });
}
