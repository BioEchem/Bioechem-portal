import nodemailer from "nodemailer";
import { getAdminEmailRecipients } from "@/lib/notify/admin-recipients";

// No-ops if SMTP env vars are not set.
async function sendEmailAlert(senderName: string, messagePreview: string) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const adminEmails = getAdminEmailRecipients();

  if (!host || !user || !pass) {
    console.warn(
      `[admin-message-alert] Skipped sending — missing ${[
        !host && "SMTP_HOST",
        !user && "SMTP_USER",
        !pass && "SMTP_PASS",
      ].filter(Boolean).join(", ")}.`,
    );
    return;
  }

  const portalUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.bioechem.com";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"BioEChem Portal" <${user}>`,
    to: adminEmails.join(", "),
    subject: `New message from ${senderName} — BioEChem Portal`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:18px">New message received</h2>
        <p style="margin:0 0 16px;color:#555;font-size:14px">
          <strong>${senderName}</strong> sent you a message on the BioEChem Portal.
        </p>
        <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;color:#333;line-height:1.5;white-space:pre-wrap">${messagePreview}</div>
        <a href="${portalUrl}/admin/messages"
           style="display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600">
          View in portal →
        </a>
        <p style="margin:24px 0 0;color:#999;font-size:12px">
          You are receiving this because you are the BioEChem admin. Log in to reply.
        </p>
      </div>
    `,
  });
}

// Call this after a non-admin message is saved. Fire-and-forget.
export function notifyAdminsOfNewMessage(senderName: string, messageBody: string) {
  const preview = messageBody.length > 300 ? messageBody.slice(0, 300) + "…" : messageBody;

  sendEmailAlert(senderName, preview).catch((err) => {
    console.error("[admin-message-alert] Email notification error:", err);
  });
}
