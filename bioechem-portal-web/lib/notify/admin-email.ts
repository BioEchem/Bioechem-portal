import nodemailer from "nodemailer";
import { getAdminEmailRecipients } from "@/lib/notify/admin-recipients";

// No-ops if SMTP env vars are not set.
async function sendAdminEmail({ subject, html }: { subject: string; html: string }) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const adminEmails = getAdminEmailRecipients();

  if (!host || !user || !pass) {
    console.warn(
      `[admin-email] Skipped sending "${subject}" — missing ${[
        !host && "SMTP_HOST",
        !user && "SMTP_USER",
        !pass && "SMTP_PASS",
      ].filter(Boolean).join(", ")}.`,
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"BioEChem Portal" <${user}>`,
    to: adminEmails.join(", "),
    subject,
    html,
  });
}

const portalUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.bioechem.com";

export function emailAdminNewSignup(name: string, email: string, role: string) {
  sendAdminEmail({
    subject: `New user pending approval — ${name}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:18px">New user pending approval</h2>
        <p style="margin:0 0 16px;color:#555;font-size:14px">
          A new user has signed up and is waiting for your approval.
        </p>
        <table style="font-size:14px;color:#333;border-collapse:collapse;margin-bottom:20px">
          <tr><td style="padding:4px 12px 4px 0;color:#888">Name</td><td><strong>${name}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#888">Email</td><td>${email}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#888">Role</td><td>${role}</td></tr>
        </table>
        <a href="${portalUrl()}/admin/approvals"
           style="display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600">
          Review in portal →
        </a>
        <p style="margin:24px 0 0;color:#999;font-size:12px">
          You are receiving this because you are the BioEChem admin.
        </p>
      </div>
    `,
  }).catch((err) => console.error("[admin-email] signup alert error:", err));
}

export function emailAdminCohortEnrollment(userName: string, cohortName: string, cohortId: string) {
  sendAdminEmail({
    subject: `Cohort enrollment pending approval — ${cohortName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:18px">Cohort enrollment pending approval</h2>
        <p style="margin:0 0 16px;color:#555;font-size:14px">
          <strong>${userName}</strong> has requested to join <strong>${cohortName}</strong> and is waiting for approval.
        </p>
        <a href="${portalUrl()}/admin/cohorts/${cohortId}"
           style="display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600">
          Review enrollment →
        </a>
        <p style="margin:24px 0 0;color:#999;font-size:12px">
          You are receiving this because you are the BioEChem admin.
        </p>
      </div>
    `,
  }).catch((err) => console.error("[admin-email] enrollment alert error:", err));
}
