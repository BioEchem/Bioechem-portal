import { google } from "googleapis";

export const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

export function createOAuth2Client() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${base}/api/auth/google/callback`,
  );
}
