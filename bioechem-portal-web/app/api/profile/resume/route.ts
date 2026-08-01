import { authError, authOk, isErrorResponse, readJsonBody } from "@/lib/auth/api-response";
import { requireApprovedUser } from "@/lib/profile/require-approved-user";

export async function GET() {
  const session = await requireApprovedUser();
  if (!session.ok) return session.response;

  const { data, error } = await session.supabase
    .from("user_resumes")
    .select("id, url, filename, uploaded_at")
    .eq("user_id", session.userId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    return authError(error.message, 400);
  }

  return authOk({ resumes: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireApprovedUser();
  if (!session.ok) return session.response;

  const parsed = await readJsonBody(request);
  if (isErrorResponse(parsed)) return parsed;

  const body = parsed.body as Record<string, unknown>;
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const filename = typeof body.filename === "string" ? body.filename.trim() : null;

  if (!url) {
    return authError("Missing resume URL.", 400);
  }

  const { error: insertErr } = await session.supabase
    .from("user_resumes")
    .insert({ user_id: session.userId, url, filename });

  if (insertErr) {
    return authError(insertErr.message, 400);
  }

  const { error: updateErr } = await session.supabase
    .from("profiles")
    .update({ resume_url: url, updated_at: new Date().toISOString() })
    .eq("id", session.userId);

  if (updateErr) {
    return authError(updateErr.message, 400);
  }

  return authOk({ ok: true });
}
