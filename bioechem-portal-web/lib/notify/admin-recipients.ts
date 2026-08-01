// Who admin alert emails (new messages, signups, enrollments) go to.
// Set ADMIN_EMAIL to a comma-separated list in .env.local to override.
const DEFAULT_ADMIN_RECIPIENTS = ["pei.zhang@bioechem.com", "team@bioechem.com"];

export function getAdminEmailRecipients(): string[] {
  const raw = process.env.ADMIN_EMAIL;
  if (!raw) return DEFAULT_ADMIN_RECIPIENTS;
  const list = raw.split(",").map((e) => e.trim()).filter(Boolean);
  return list.length > 0 ? list : DEFAULT_ADMIN_RECIPIENTS;
}
