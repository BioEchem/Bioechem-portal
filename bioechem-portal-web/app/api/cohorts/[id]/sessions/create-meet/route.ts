import { NextResponse } from "next/server";
import { google } from "googleapis";
import { requireSession } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createOAuth2Client } from "@/lib/google/oauth";

export async function POST(req: Request) {
  const { user, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "role, approval_status",
  });

  const canManage = ["teacher", "bioechem_admin"].includes(profile.role ?? "");
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Server error" }, { status: 500 });

  const { data: tokenRow } = await admin
    .from("user_google_tokens")
    .select("access_token, refresh_token, token_expiry")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!tokenRow?.access_token) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.json({
      needsAuth: true,
      authUrl: `${base}/api/auth/google?popup=1`,
    });
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token ?? undefined,
    expiry_date: tokenRow.token_expiry ? new Date(tokenRow.token_expiry).getTime() : undefined,
  });

  // Persist refreshed tokens automatically
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await admin.from("user_google_tokens").update({
        access_token: tokens.access_token,
        token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    }
  });

  const body = await req.json() as Record<string, unknown>;
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Class Session";
  const scheduledAt = typeof body.scheduled_at === "string" ? body.scheduled_at : new Date().toISOString();
  const durationMinutes = typeof body.duration_minutes === "number" ? body.duration_minutes : 60;
  const endTime = new Date(new Date(scheduledAt).getTime() + durationMinutes * 60 * 1000).toISOString();

  try {
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const event = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      requestBody: {
        summary: title,
        start: { dateTime: scheduledAt },
        end: { dateTime: endTime },
        conferenceData: {
          createRequest: {
            requestId: `bioechem-${user.id.slice(0, 8)}-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const meetUrl = event.data.hangoutLink;
    if (!meetUrl) return NextResponse.json({ error: "Google did not return a Meet link" }, { status: 500 });

    return NextResponse.json({ meetUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create Meet link";
    // Token likely revoked — clear it so next attempt re-auths
    if (msg.includes("invalid_grant") || msg.includes("Token has been expired")) {
      await admin.from("user_google_tokens").delete().eq("user_id", user.id);
      const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      return NextResponse.json({ needsAuth: true, authUrl: `${base}/api/auth/google?popup=1` });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
