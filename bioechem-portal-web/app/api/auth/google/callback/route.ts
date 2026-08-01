import { NextResponse } from "next/server";
import { createOAuth2Client } from "@/lib/google/oauth";
import { requireSession } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const { user } = await requireSession({ requireApproved: true });

  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  const admin = createServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Server error" }, { status: 500 });

  await admin.from("user_google_tokens").upsert({
    user_id: user.id,
    access_token: tokens.access_token ?? null,
    refresh_token: tokens.refresh_token ?? null,
    token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    updated_at: new Date().toISOString(),
  });

  if (state === "popup") {
    return new NextResponse(
      `<!DOCTYPE html><html><body><script>
        window.opener?.postMessage({ type: "google-auth-success" }, "*");
        window.close();
      </script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
