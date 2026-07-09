import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { emailShareholdersNewDocument } from "@/lib/notify/user-email";

const VALID_CATEGORIES = ["general", "report", "financial", "meeting", "governance"];

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("shareholder_documents")
    .select("id, title, description, category, file_name, size_bytes, mime_type, storage_path, published, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json() as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required." }, { status: 400 });

  const category = VALID_CATEGORIES.includes(body.category as string) ? (body.category as string) : "general";

  const { data, error } = await auth.supabase
    .from("shareholder_documents")
    .insert({
      title,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      category,
      published:   body.published !== false,
      created_by:  auth.adminUserId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Notify all shareholders and industry_partners when published (fire-and-forget)
  if (data.published) {
    void (async () => {
      const db = createServiceRoleClient();
      if (!db) return;
      const { data: profiles } = await db
        .from("profiles")
        .select("email, full_name")
        .in("role", ["shareholder", "industry_partner"])
        .eq("approval_status", "approved");
      const recipients = (profiles ?? []).flatMap((p) =>
        p.email ? [{ email: p.email as string, name: (p.full_name as string | null) ?? p.email as string }] : []
      );
      if (recipients.length > 0) {
        emailShareholdersNewDocument(recipients, title, category);
      }
    })();
  }

  return NextResponse.json({ data }, { status: 201 });
}
