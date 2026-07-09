import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { notifyAdminsOfNewMessage } from "@/lib/notify/admin-message-alert";
import { emailUserNewMessage } from "@/lib/notify/user-email";

type RawMessage = {
  id: string;
  sender_id: string;
  body: string;
  sent_at: string;
};

type MessageRow = RawMessage & {
  profiles: { full_name: string | null; email: string | null } | null;
};

async function isAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role, approval_status")
    .eq("id", userId)
    .single();
  return data?.role === "bioechem_admin" && data?.approval_status === "approved";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const targetUserId = url.searchParams.get("user_id");
  const callerIsAdmin = await isAdmin(supabase, user.id);
  const conversationUserId = (callerIsAdmin && targetUserId) ? targetUserId : user.id;

  // Upsert conversation so it always exists
  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .upsert({ user_id: conversationUserId }, { onConflict: "user_id" })
    .select("id, unread_by_admin, unread_by_user")
    .single();

  if (convError || !conv) {
    return NextResponse.json({ error: "Could not load conversation." }, { status: 500 });
  }

  // Mark as read by viewer
  if (callerIsAdmin && conv.unread_by_admin) {
    await supabase.from("conversations").update({ unread_by_admin: false }).eq("id", conv.id);
  } else if (!callerIsAdmin && conv.unread_by_user) {
    await supabase.from("conversations").update({ unread_by_user: false }).eq("id", conv.id);
  }

  const { data: rawMessages, error: msgError } = await supabase
    .from("messages")
    .select("id, sender_id, body, sent_at")
    .eq("conversation_id", conv.id)
    .order("sent_at", { ascending: true })
    .returns<RawMessage[]>();

  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 });

  const msgs = rawMessages ?? [];

  // Manual profile join — use service role so all sender profiles are visible regardless of RLS
  const senderIds = [...new Set(msgs.map((m) => m.sender_id))];
  const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
  if (senderIds.length > 0) {
    const adminClient = createServiceRoleClient() ?? supabase;
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", senderIds);
    for (const p of profiles ?? []) profileMap.set(p.id, { full_name: p.full_name, email: p.email });
  }

  const messages: MessageRow[] = msgs.map((m) => ({
    ...m,
    profiles: profileMap.get(m.sender_id) ?? null,
  }));

  return NextResponse.json({ data: { conversation_id: conv.id, messages } });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { body?: string; target_user_id?: string };
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });

  const callerIsAdmin = await isAdmin(supabase, user.id);
  const conversationUserId = (callerIsAdmin && body.target_user_id) ? body.target_user_id : user.id;

  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .upsert({ user_id: conversationUserId }, { onConflict: "user_id" })
    .select("id")
    .single();

  if (convError || !conv) return NextResponse.json({ error: "Could not create conversation." }, { status: 500 });

  const { error: msgError } = await supabase
    .from("messages")
    .insert({ conversation_id: conv.id, sender_id: user.id, body: text });

  if (msgError) return NextResponse.json({ error: msgError.message }, { status: 400 });

  // Notify admins when a non-admin user sends a message (fire-and-forget)
  if (!callerIsAdmin) {
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();
    const senderName = senderProfile?.full_name ?? senderProfile?.email ?? "A user";
    notifyAdminsOfNewMessage(senderName, text);
  }

  // Notify the participant when the admin sends them a message (fire-and-forget)
  if (callerIsAdmin && body.target_user_id) {
    const adminClient = createServiceRoleClient();
    if (adminClient) {
      void (async () => {
        const { data } = await adminClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", body.target_user_id!)
          .single();
        if (data?.email) {
          emailUserNewMessage(
            data.email as string,
            (data.full_name as string | null) ?? data.email as string,
            text,
          );
        }
      })();
    }
  }

  const convUpdate: Record<string, unknown> = {
    last_message_at: new Date().toISOString(),
    unread_by_admin: !callerIsAdmin,
    unread_by_user: callerIsAdmin,
  };
  // When admin replies, claim the conversation as handled by them
  if (callerIsAdmin) convUpdate.handled_by = user.id;

  await supabase.from("conversations").update(convUpdate).eq("id", conv.id);

  return NextResponse.json({ data: null }, { status: 201 });
}

// PATCH /api/messages — admin claims or releases a conversation
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerIsAdmin = await isAdmin(supabase, user.id);
  if (!callerIsAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { conversation_id: string; action: "claim" | "release" };
  if (!body.conversation_id) return NextResponse.json({ error: "conversation_id required" }, { status: 400 });

  const handled_by = body.action === "claim" ? user.id : null;

  const { error } = await supabase
    .from("conversations")
    .update({ handled_by })
    .eq("id", body.conversation_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: null });
}
