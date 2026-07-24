import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { emailBulkRecipients } from "@/lib/notify/user-email";

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MAX_RECIPIENTS = 1000;

export async function POST(req: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json() as { subject?: unknown; message?: unknown; emails?: unknown };

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!subject) return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });

  if (!Array.isArray(body.emails) || body.emails.some((e) => typeof e !== "string"))
    return NextResponse.json({ error: "emails must be a list of addresses." }, { status: 400 });

  const emails = Array.from(new Set((body.emails as string[]).map((e) => e.trim().toLowerCase())))
    .filter((e) => EMAIL_RE.test(e));

  if (emails.length === 0) return NextResponse.json({ error: "No valid recipients." }, { status: 400 });
  if (emails.length > MAX_RECIPIENTS)
    return NextResponse.json({ error: `Too many recipients (max ${MAX_RECIPIENTS}).` }, { status: 400 });

  emailBulkRecipients(emails, subject, message);

  return NextResponse.json({ data: { sent: emails.length } });
}
