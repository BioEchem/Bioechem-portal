import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { supabase, user, profile } = await requireSession({ requireApproved: true });

  if (profile.role !== "shareholder" && profile.role !== "bioechem_admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  const { data: doc, error } = await supabase
    .from("shareholder_documents")
    .select("storage_path, file_name, published, shared_with")
    .eq("id", id)
    .single();

  if (error || !doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!doc.storage_path) return NextResponse.json({ error: "No file attached." }, { status: 404 });

  const isVisible = doc.published && (doc.shared_with === null || doc.shared_with.includes(user.id));
  if (profile.role !== "bioechem_admin" && !isVisible) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  const { data: signed, error: signError } = await admin.storage
    .from("shareholder-docs")
    .createSignedUrl(doc.storage_path, 60 * 60); // 1 hour

  if (signError || !signed) {
    return NextResponse.json({ error: signError?.message ?? "Failed to generate link." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, file_name: doc.file_name });
}
