import { NextResponse } from "next/server";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createNotification } from "@/lib/notifications/create";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const { data, error } = await auth.supabase
    .from("job_applications")
    .select("id, status, cover_letter, admin_notes, created_at, profiles(id, full_name, email, role, resume_url)")
    .eq("job_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id: jobId } = await params;
  const body = await req.json() as Record<string, unknown>;
  const applicationId = typeof body.application_id === "string" ? body.application_id : null;
  if (!applicationId) return NextResponse.json({ error: "application_id required." }, { status: 400 });

  const VALID_STATUSES = ["pending", "reviewed", "accepted", "rejected"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.status === "string" && VALID_STATUSES.includes(body.status)) updates.status = body.status;
  if (typeof body.admin_notes === "string") updates.admin_notes = body.admin_notes.trim() || null;

  const { data, error } = await auth.supabase
    .from("job_applications")
    .update(updates)
    .eq("id", applicationId)
    .eq("job_id", jobId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Notify applicant when status changes meaningfully
  if (updates.status && updates.status !== "pending") {
    const statusLabel: Record<string, string> = {
      reviewed: "is being reviewed",
      accepted: "has been accepted 🎉",
      rejected: "was not selected",
    };
    const label = statusLabel[updates.status as string] ?? String(updates.status);
    await createNotification({
      userId: data.user_id,
      type: "job_application",
      title: `Your job application ${label}`,
      link: "/jobs",
    });
  }

  return NextResponse.json({ data });
}
