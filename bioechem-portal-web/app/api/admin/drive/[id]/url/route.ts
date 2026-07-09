import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  const { data: item, error } = await db
    .from("drive_items")
    .select("storage_path, name")
    .eq("id", id)
    .single();

  if (error || !item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!item.storage_path) return NextResponse.json({ error: "No storage path." }, { status: 400 });

  const { data: signed, error: signError } = await db.storage
    .from("drive")
    .createSignedUrl(item.storage_path, 60 * 60); // 1 hour

  if (signError || !signed) {
    return NextResponse.json({ error: signError?.message ?? "Failed to sign URL." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
