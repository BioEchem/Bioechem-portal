import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";

type ActionItem = { action: string; credits: string; note?: string };

export async function GET() {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("credits_page_content")
    .select("id, intro_text, claim_text, actions, updated_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: Request) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json() as Record<string, unknown>;
  const introText = typeof body.intro_text === "string" ? body.intro_text.trim() : "";
  const claimText = typeof body.claim_text === "string" ? body.claim_text.trim() : "";
  const actionsRaw = Array.isArray(body.actions) ? body.actions : [];

  if (!introText || !claimText) {
    return NextResponse.json({ error: "Intro and claim text are required." }, { status: 400 });
  }

  const actions: ActionItem[] = actionsRaw
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map((a) => ({
      action: typeof a.action === "string" ? a.action.trim() : "",
      credits: typeof a.credits === "string" ? a.credits.trim() : "",
      note: typeof a.note === "string" ? a.note.trim() || undefined : undefined,
    }))
    .filter((a) => a.action && a.credits);

  // Find the existing single row (if any) to update; otherwise insert one.
  const { data: existing } = await auth.supabase
    .from("credits_page_content")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const payload = {
    intro_text: introText,
    claim_text: claimText,
    actions,
    updated_at: new Date().toISOString(),
    updated_by: auth.adminUserId,
  };

  const { data, error } = existing
    ? await auth.supabase
        .from("credits_page_content")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single()
    : await auth.supabase
        .from("credits_page_content")
        .insert(payload)
        .select()
        .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
