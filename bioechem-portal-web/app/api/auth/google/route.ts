import { NextResponse } from "next/server";
import { createOAuth2Client, CALENDAR_SCOPES } from "@/lib/google/oauth";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  await requireSession({ requireApproved: true });

  const { searchParams } = new URL(req.url);
  const popup = searchParams.get("popup") === "1";

  const oauth2Client = createOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: CALENDAR_SCOPES,
    prompt: "consent",
    state: popup ? "popup" : "page",
  });

  return NextResponse.redirect(authUrl);
}
