import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

const LAST_SEEN_COOKIE = "bio_last_seen";
const SESSION_START_COOKIE = "bio_session_start";
const INACTIVITY_MS = 20 * 60 * 1000;   // 20 minutes of inactivity
const MAX_SESSION_DAYS = 30;             // 30 day absolute max
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const now = Date.now();
    const lastSeen = parseInt(request.cookies.get(LAST_SEEN_COOKIE)?.value ?? "0", 10);
    const sessionStart = parseInt(request.cookies.get(SESSION_START_COOKIE)?.value ?? "0", 10);

    const inactiveTooLong = lastSeen > 0 && now - lastSeen > INACTIVITY_MS;
    const sessionTooOld = sessionStart > 0 && now - sessionStart > MAX_SESSION_DAYS * MS_PER_DAY;

    if (inactiveTooLong || sessionTooOld) {
      await supabase.auth.signOut();
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("reason", "session_expired");
      const logoutResponse = NextResponse.redirect(loginUrl);
      logoutResponse.cookies.delete(LAST_SEEN_COOKIE);
      logoutResponse.cookies.delete(SESSION_START_COOKIE);
      return logoutResponse;
    }

    // Update last-seen on every request (20 min window needs frequent updates)
    supabaseResponse.cookies.set(LAST_SEEN_COOKIE, String(now), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: MAX_SESSION_DAYS * 24 * 60 * 60,
    });

    // Record session start time on first authenticated request
    if (!sessionStart) {
      supabaseResponse.cookies.set(SESSION_START_COOKIE, String(now), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: MAX_SESSION_DAYS * 24 * 60 * 60,
      });
    }
  } else {
    supabaseResponse.cookies.delete(LAST_SEEN_COOKIE);
    supabaseResponse.cookies.delete(SESSION_START_COOKIE);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
