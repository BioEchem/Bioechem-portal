import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createNotifications } from "@/lib/notifications/create";
import { emailPartnersNewAnnouncement } from "@/lib/notify/user-email";

const VALID_TARGETS = ["all", "industry", "government", "specific"];
const MAX_SIZE = 50 * 1024 * 1024;

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("partner_announcements")
    .select("id, title, body, target, target_partner_id, storage_path, file_name, size_bytes, created_at, profiles!target_partner_id(full_name, email)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
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
  const targetPartnerId = formData.get("targetPartnerId");
  const file = formData.get("file");

  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!body) return NextResponse.json({ error: "Message body is required." }, { status: 400 });
  if (!VALID_TARGETS.includes(target)) return NextResponse.json({ error: "Invalid target." }, { status: 400 });
  if (target === "specific" && typeof targetPartnerId !== "string")
    return NextResponse.json({ error: "A specific partner is required for that target." }, { status: 400 });

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Server not configured." }, { status: 500 });

  // Resolve recipients
  let recipientsQuery = admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "industry_partner")
    .eq("approval_status", "approved");

  if (target === "industry" || target === "government") {
    recipientsQuery = recipientsQuery.eq("partner_type", target);
  } else if (target === "specific") {
    recipientsQuery = recipientsQuery.eq("id", targetPartnerId as string);
  }

  const { data: recipients, error: recipientsError } = await recipientsQuery;
  if (recipientsError) return NextResponse.json({ error: recipientsError.message }, { status: 500 });
  if (!recipients || recipients.length === 0)
    return NextResponse.json({ error: "No matching partners to send to." }, { status: 400 });

  // Optional file attachment
  let storagePath: string | null = null;
  let fileName: string | null = null;
  let sizeBytes: number | null = null;
  let mimeType: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 50 MB)." }, { status: 413 });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    storagePath = `announcements/${Date.now()}_${safeName}`;
    const { error: uploadError } = await admin.storage
      .from("partner-docs")
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
    .from("partner_announcements")
    .insert({
      title,
      body,
      target,
      target_partner_id: target === "specific" ? targetPartnerId : null,
      storage_path: storagePath,
      file_name: fileName,
      size_bytes: sizeBytes,
      mime_type: mimeType,
      created_by: auth.adminUserId,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  // In-app notifications + email (fire-and-forget)
  void createNotifications(
    recipients.map((r) => ({
      userId: r.id,
      type: "announcement" as const,
      title,
      body: body.length > 140 ? `${body.slice(0, 140)}…` : body,
      link: "/partner-docs?tab=announcements",
    })),
  );

  const emailRecipients = recipients
    .filter((r): r is typeof r & { email: string } => !!r.email)
    .map((r) => ({ email: r.email, name: r.full_name ?? r.email }));
  emailPartnersNewAnnouncement(emailRecipients, title, body);

  return NextResponse.json({ data: announcement }, { status: 201 });
}
