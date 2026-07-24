import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createNotifications } from "@/lib/notifications/create";
import { emailShareholdersNewAnnouncement } from "@/lib/notify/user-email";

const VALID_TARGETS = ["all", "specific"];
const MAX_SIZE = 50 * 1024 * 1024;

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("shareholder_announcements")
    .select("id, title, body, target, target_shareholder_ids, storage_path, file_name, size_bytes, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allIds = Array.from(
    new Set((data ?? []).flatMap((a) => a.target_shareholder_ids ?? []))
  );
  const namesById = new Map<string, { full_name: string | null; email: string | null }>();
  if (allIds.length > 0) {
    const { data: profiles } = await auth.supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", allIds);
    for (const p of profiles ?? []) namesById.set(p.id, { full_name: p.full_name, email: p.email });
  }

  const withNames = (data ?? []).map((a) => ({
    ...a,
    target_shareholders: (a.target_shareholder_ids ?? []).map((id: string) => ({ id, ...namesById.get(id) })),
  }));

  return NextResponse.json({ data: withNames });
}

export async function POST(req: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data." }, { status: 400 }); }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const target = String(formData.get("target") ?? "");
  const targetShareholderIds = formData.getAll("targetShareholderIds").filter(
    (v): v is string => typeof v === "string" && v.length > 0
  );
  const file = formData.get("file");

  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!body) return NextResponse.json({ error: "Message body is required." }, { status: 400 });
  if (!VALID_TARGETS.includes(target)) return NextResponse.json({ error: "Invalid target." }, { status: 400 });
  if (target === "specific" && targetShareholderIds.length === 0)
    return NextResponse.json({ error: "Pick at least one shareholder for that target." }, { status: 400 });

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Server not configured." }, { status: 500 });

  let recipientsQuery = admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "shareholder")
    .eq("approval_status", "approved");

  if (target === "specific") {
    recipientsQuery = recipientsQuery.in("id", targetShareholderIds);
  }

  const { data: recipients, error: recipientsError } = await recipientsQuery;
  if (recipientsError) return NextResponse.json({ error: recipientsError.message }, { status: 500 });
  if (!recipients || recipients.length === 0)
    return NextResponse.json({ error: "No matching shareholders to send to." }, { status: 400 });

  let storagePath: string | null = null;
  let fileName: string | null = null;
  let sizeBytes: number | null = null;
  let mimeType: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 50 MB)." }, { status: 413 });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    storagePath = `announcements/${Date.now()}_${safeName}`;
    const { error: uploadError } = await admin.storage
      .from("shareholder-docs")
      .upload(storagePath, await file.arrayBuffer(), {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    fileName = file.name;
    sizeBytes = file.size;
    mimeType = file.type || null;
  }

  const { data: announcement, error: insertError } = await auth.supabase
    .from("shareholder_announcements")
    .insert({
      title,
      body,
      target,
      target_shareholder_ids: target === "specific" ? targetShareholderIds : null,
      storage_path: storagePath,
      file_name: fileName,
      size_bytes: sizeBytes,
      mime_type: mimeType,
      created_by: auth.adminUserId,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  void createNotifications(
    recipients.map((r) => ({
      userId: r.id,
      type: "announcement" as const,
      title,
      body: body.length > 140 ? `${body.slice(0, 140)}…` : body,
      link: "/shareholder-docs?tab=announcements",
    })),
  );

  const emailRecipients = recipients
    .filter((r): r is typeof r & { email: string } => !!r.email)
    .map((r) => ({ email: r.email, name: r.full_name ?? r.email }));
  emailShareholdersNewAnnouncement(emailRecipients, title, body);

  return NextResponse.json({ data: announcement }, { status: 201 });
}
