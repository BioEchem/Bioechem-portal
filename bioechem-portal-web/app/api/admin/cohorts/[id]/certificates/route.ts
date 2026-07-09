import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createNotification } from "@/lib/notifications/create";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;
  const { id: cohortId } = await params;

  const { data, error } = await supabase
    .from("certificates")
    .select("id, title, file_url, filename, uploaded_at, user_id, profiles!user_id(full_name, email)")
    .eq("cohort_id", cohortId)
    .order("uploaded_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;
  const { supabase, adminUserId } = auth;
  const { id: cohortId } = await params;

  const body = await request.json() as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const file_url = typeof body.file_url === "string" ? body.file_url.trim() : "";
  const user_id = typeof body.user_id === "string" ? body.user_id : "";
  const filename = typeof body.filename === "string" ? body.filename.trim() || null : null;

  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!file_url) return NextResponse.json({ error: "File URL is required." }, { status: 400 });
  if (!user_id) return NextResponse.json({ error: "Student is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("certificates")
    .insert({ cohort_id: cohortId, user_id, title, file_url, filename, uploaded_by: adminUserId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Notify the student
  await createNotification({
    userId: user_id,
    type: "certificate",
    title: "You received a certificate!",
    body: `"${title}" has been issued to you.`,
    link: "/certificates",
  });

  return NextResponse.json({ data }, { status: 201 });
}
