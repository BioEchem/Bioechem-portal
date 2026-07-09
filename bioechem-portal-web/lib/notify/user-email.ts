import nodemailer from "nodemailer";

const portalUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.bioechem.com";

async function sendUserEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || !to) return;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"BioEChem Portal" <${user}>`,
    to,
    subject,
    html,
  });
}

function baseWrapper(content: string) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
      <div style="margin-bottom:20px">
        <span style="font-size:18px;font-weight:700;color:#2e7d32">BioEChem Portal</span>
      </div>
      ${content}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="font-size:12px;color:#999;margin:0">
        You're receiving this because you have an account on the BioEChem Portal.
      </p>
    </div>
  `;
}

/** Sent to participant when their account is approved. */
export function emailUserApproved(toEmail: string, name: string) {
  sendUserEmail({
    to: toEmail,
    subject: "Your BioEChem account has been approved!",
    html: baseWrapper(`
      <h2 style="margin:0 0 8px;font-size:18px">Welcome aboard, ${name}!</h2>
      <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6">
        Your account has been reviewed and approved by the BioEChem team.
        You can now log in and access your courses, assignments, and more.
      </p>
      <a href="${portalUrl()}/dashboard"
         style="display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600">
        Go to dashboard →
      </a>
    `),
  }).catch((err) => console.error("[user-email] approved:", err));
}

/** Sent to participant when their account is rejected. */
export function emailUserRejected(toEmail: string, name: string, reason: string | null) {
  sendUserEmail({
    to: toEmail,
    subject: "Update on your BioEChem account application",
    html: baseWrapper(`
      <h2 style="margin:0 0 8px;font-size:18px">Hi ${name},</h2>
      <p style="margin:0 0 12px;color:#555;font-size:14px;line-height:1.6">
        After reviewing your application, we're unable to approve your BioEChem Portal account at this time.
      </p>
      ${reason ? `
      <div style="background:#fff3f3;border-left:3px solid #e53935;padding:12px 16px;border-radius:4px;margin-bottom:16px;font-size:14px;color:#333">
        ${reason}
      </div>` : ""}
      <p style="color:#555;font-size:14px;line-height:1.6">
        If you believe this is a mistake, please contact us for more information.
      </p>
    `),
  }).catch((err) => console.error("[user-email] rejected:", err));
}

/** Sent to all enrolled participants when a new announcement is posted. */
export function emailUsersNewAnnouncement(
  recipients: { email: string; name: string }[],
  cohortName: string,
  announcementTitle: string,
  cohortId: string,
) {
  for (const { email, name } of recipients) {
    sendUserEmail({
      to: email,
      subject: `New announcement in ${cohortName}: ${announcementTitle}`,
      html: baseWrapper(`
        <h2 style="margin:0 0 8px;font-size:18px">New announcement</h2>
        <p style="margin:0 0 4px;color:#555;font-size:14px">Hi ${name},</p>
        <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6">
          A new announcement has been posted in <strong>${cohortName}</strong>:
          <strong>${announcementTitle}</strong>
        </p>
        <a href="${portalUrl()}/cohorts/${cohortId}?tab=home"
           style="display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600">
          View announcement →
        </a>
      `),
    }).catch((err) => console.error("[user-email] announcement:", err));
  }
}

/** Sent to all enrolled participants when a new assignment is posted. */
export function emailUsersNewAssignment(
  recipients: { email: string; name: string }[],
  cohortName: string,
  assignmentTitle: string,
  dueAt: string | null,
  cohortId: string,
) {
  const dueStr = dueAt
    ? `Due: ${new Date(dueAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`
    : "No due date";

  for (const { email, name } of recipients) {
    sendUserEmail({
      to: email,
      subject: `New assignment in ${cohortName}: ${assignmentTitle}`,
      html: baseWrapper(`
        <h2 style="margin:0 0 8px;font-size:18px">New assignment posted</h2>
        <p style="margin:0 0 4px;color:#555;font-size:14px">Hi ${name},</p>
        <p style="margin:0 0 8px;color:#555;font-size:14px;line-height:1.6">
          A new assignment has been posted in <strong>${cohortName}</strong>:
        </p>
        <div style="background:#f5f9f5;border-left:3px solid #2e7d32;padding:12px 16px;border-radius:4px;margin-bottom:20px">
          <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#1a1a1a">${assignmentTitle}</p>
          <p style="margin:0;font-size:13px;color:#666">${dueStr}</p>
        </div>
        <a href="${portalUrl()}/cohorts/${cohortId}?tab=assignments"
           style="display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600">
          View assignment →
        </a>
      `),
    }).catch((err) => console.error("[user-email] assignment:", err));
  }
}

/** Sent to participant when their cohort enrollment is approved or rejected. */
export function emailUserEnrollmentDecision(
  toEmail: string,
  name: string,
  cohortName: string,
  approved: boolean,
  reason: string | null,
  cohortId: string,
) {
  if (approved) {
    sendUserEmail({
      to: toEmail,
      subject: `You've been enrolled in ${cohortName}`,
      html: baseWrapper(`
        <h2 style="margin:0 0 8px;font-size:18px">Enrollment approved!</h2>
        <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6">
          Hi ${name}, your enrollment request for <strong>${cohortName}</strong> has been approved.
          You can now access course content, assignments, and more.
        </p>
        <a href="${portalUrl()}/cohorts/${cohortId}"
           style="display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600">
          Go to course →
        </a>
      `),
    }).catch((err) => console.error("[user-email] enrollment approved:", err));
  } else {
    sendUserEmail({
      to: toEmail,
      subject: `Enrollment update for ${cohortName}`,
      html: baseWrapper(`
        <h2 style="margin:0 0 8px;font-size:18px">Enrollment not approved</h2>
        <p style="margin:0 0 12px;color:#555;font-size:14px;line-height:1.6">
          Hi ${name}, your enrollment request for <strong>${cohortName}</strong> was not approved at this time.
        </p>
        ${reason ? `
        <div style="background:#fff3f3;border-left:3px solid #e53935;padding:12px 16px;border-radius:4px;margin-bottom:16px;font-size:14px;color:#333">
          ${reason}
        </div>` : ""}
        <p style="color:#555;font-size:14px;">Please contact us if you have questions.</p>
      `),
    }).catch((err) => console.error("[user-email] enrollment rejected:", err));
  }
}

/** Sent to participant when their assignment submission is graded. */
export function emailUserGraded(
  toEmail: string,
  name: string,
  assignmentTitle: string,
  pointsEarned: number | null,
  maxPoints: number | null,
  feedback: string | null,
  cohortId: string,
) {
  const scoreStr = pointsEarned !== null && maxPoints !== null
    ? `${pointsEarned} / ${maxPoints} points`
    : "Graded";
  sendUserEmail({
    to: toEmail,
    subject: `Your assignment has been graded: ${assignmentTitle}`,
    html: baseWrapper(`
      <h2 style="margin:0 0 8px;font-size:18px">Assignment graded</h2>
      <p style="margin:0 0 4px;color:#555;font-size:14px">Hi ${name},</p>
      <p style="margin:0 0 12px;color:#555;font-size:14px;line-height:1.6">
        Your submission for <strong>${assignmentTitle}</strong> has been graded.
      </p>
      <div style="background:#f5f9f5;border-left:3px solid #2e7d32;padding:12px 16px;border-radius:4px;margin-bottom:20px">
        <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#2e7d32">${scoreStr}</p>
        ${feedback ? `<p style="margin:4px 0 0;font-size:13px;color:#555;line-height:1.5">${feedback.slice(0, 200)}${feedback.length > 200 ? "…" : ""}</p>` : ""}
      </div>
      <a href="${portalUrl()}/cohorts/${cohortId}?tab=grades"
         style="display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600">
        View grades →
      </a>
    `),
  }).catch((err) => console.error("[user-email] graded:", err));
}

/** Sent to enrolled participants when a new module is published. */
export function emailUsersNewModule(
  recipients: { email: string; name: string }[],
  cohortName: string,
  moduleTitle: string,
  cohortId: string,
) {
  for (const { email, name } of recipients) {
    sendUserEmail({
      to: email,
      subject: `New module in ${cohortName}: ${moduleTitle}`,
      html: baseWrapper(`
        <h2 style="margin:0 0 8px;font-size:18px">New module available</h2>
        <p style="margin:0 0 4px;color:#555;font-size:14px">Hi ${name},</p>
        <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6">
          A new module has been published in <strong>${cohortName}</strong>: <strong>${moduleTitle}</strong>
        </p>
        <a href="${portalUrl()}/cohorts/${cohortId}?tab=modules"
           style="display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600">
          View module →
        </a>
      `),
    }).catch((err) => console.error("[user-email] new module:", err));
  }
}

/** Sent to teachers in a cohort when a student submits an assignment. */
export function emailTeachersNewSubmission(
  recipients: { email: string; name: string }[],
  cohortName: string,
  studentName: string,
  assignmentTitle: string,
  cohortId: string,
) {
  for (const { email, name } of recipients) {
    sendUserEmail({
      to: email,
      subject: `New submission in ${cohortName}: ${assignmentTitle}`,
      html: baseWrapper(`
        <h2 style="margin:0 0 8px;font-size:18px">New assignment submission</h2>
        <p style="margin:0 0 4px;color:#555;font-size:14px">Hi ${name},</p>
        <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6">
          <strong>${studentName}</strong> submitted <strong>${assignmentTitle}</strong> in <strong>${cohortName}</strong>.
        </p>
        <a href="${portalUrl()}/cohorts/${cohortId}?tab=grades"
           style="display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600">
          Review submissions →
        </a>
      `),
    }).catch((err) => console.error("[user-email] new submission:", err));
  }
}

/** Sent to all shareholders / industry partners when a new document is published. */
export function emailShareholdersNewDocument(
  recipients: { email: string; name: string }[],
  docTitle: string,
  category: string,
) {
  for (const { email, name } of recipients) {
    sendUserEmail({
      to: email,
      subject: `New document available: ${docTitle}`,
      html: baseWrapper(`
        <h2 style="margin:0 0 8px;font-size:18px">New document available</h2>
        <p style="margin:0 0 4px;color:#555;font-size:14px">Hi ${name},</p>
        <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6">
          A new <strong>${category}</strong> document has been shared with you on the BioEChem Portal:
          <strong>${docTitle}</strong>
        </p>
        <a href="${portalUrl()}/shareholder-docs"
           style="display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600">
          View document →
        </a>
      `),
    }).catch((err) => console.error("[user-email] shareholder doc:", err));
  }
}

/** Sent to a participant when the admin sends them a direct message. */
export function emailUserNewMessage(
  toEmail: string,
  name: string,
  messagePreview: string,
) {
  const preview = messagePreview.length > 300 ? messagePreview.slice(0, 300) + "…" : messagePreview;
  sendUserEmail({
    to: toEmail,
    subject: "You have a new message from BioEChem",
    html: baseWrapper(`
      <h2 style="margin:0 0 8px;font-size:18px">New message</h2>
      <p style="margin:0 0 12px;color:#555;font-size:14px">Hi ${name}, you have a new message from the BioEChem team:</p>
      <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap">${preview}</div>
      <a href="${portalUrl()}/messaging"
         style="display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600">
        Reply in portal →
      </a>
    `),
  }).catch((err) => console.error("[user-email] message:", err));
}
