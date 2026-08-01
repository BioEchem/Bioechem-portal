import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { supabase, profile } = await requireSession({ requireApproved: true });

  if (profile.role !== "shareholder" && profile.role !== "bioechem_admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  // RLS scopes this select to announcements the caller is allowed to see.
  const { data: announcement, error } = await supabase
    .from("shareholder_announcements")
    .select("storage_path, file_name")
    .eq("id", id)
    .maybeSingle();

  if (error || !announcement) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!announcement.storage_path) return NextResponse.json({ error: "No file attached." }, { status: 404 });

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  const { data: signed, error: signError } = await admin.storage
    .from("shareholder-docs")
    .createSignedUrl(announcement.storage_path, 60 * 60);

  if (signError || !signed) {
    return NextResponse.json({ error: signError?.message ?? "Failed to generate link." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, file_name: announcement.file_name });
}
