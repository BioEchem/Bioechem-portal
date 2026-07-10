import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { supabase, profile } = await requireSession({ requireApproved: true });

  if (profile.role !== "industry_partner" && profile.role !== "bioechem_admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  const { data: doc, error } = await supabase
    .from("partner_documents")
    .select("storage_path, file_name")
    .eq("id", id)
    .eq("published", true)
    .single();

  if (error || !doc) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!doc.storage_path) return NextResponse.json({ error: "No file attached." }, { status: 404 });

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  const { data: signed, error: signError } = await admin.storage
    .from("partner-docs")
    .createSignedUrl(doc.storage_path, 60 * 60);

  if (signError || !signed) {
    return NextResponse.json({ error: signError?.message ?? "Failed to generate link." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, file_name: doc.file_name });
}
