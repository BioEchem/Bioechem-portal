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
    .select("id, title, description, category, file_name, size_bytes, mime_type, storage_path, published, shared_with, created_at")
    .is("shareholder_id", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

function parseSharedWith(body: Record<string, unknown>): string[] | null {
  if (!Array.isArray(body.shared_with)) return null;
  const ids = body.shared_with.filter((v): v is string => typeof v === "string" && v.length > 0);
  return ids.length > 0 ? ids : null;
}

export async function POST(req: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json() as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required." }, { status: 400 });

  const category = VALID_CATEGORIES.includes(body.category as string) ? (body.category as string) : "general";
  const sharedWith = parseSharedWith(body);

  const { data, error } = await auth.supabase
    .from("shareholder_documents")
    .insert({
      title,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      category,
      published:   body.published !== false,
      shared_with: sharedWith,
      created_by:  auth.adminUserId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Notify recipients when published (fire-and-forget). If shared_with is
  // set, only notify those specific people; otherwise broadcast as before.
  if (data.published) {
    void (async () => {
      const db = createServiceRoleClient();
      if (!db) return;
      const query = db
        .from("profiles")
        .select("email, full_name")
        .eq("approval_status", "approved");

      const { data: profiles } = sharedWith
        ? await query.in("id", sharedWith)
        : await query.in("role", ["shareholder", "industry_partner"]);

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
