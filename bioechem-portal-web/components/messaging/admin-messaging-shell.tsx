"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MessageSquarePlus, UserCheck, X, ExternalLink, ArrowLeft } from "lucide-react";
import { getRoleLabel } from "@/lib/profile/display";
import { MessageThread } from "@/components/messaging/message-thread";
import { getShortInitials as getInitials } from "@/lib/profile/display";

type ProfileEntry = { full_name: string | null; email: string | null; role: string | null };

type ConversationRow = {
  id: string;
  user_id: string;
  last_message_at: string | null;
  unread_by_admin: boolean;
  handled_by: string | null;
  profiles: ProfileEntry | null;
  handler: ProfileEntry | null;
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function handlerLabel(handler: ProfileEntry | null) {
  if (!handler) return null;
  return handler.full_name ?? handler.email ?? "Admin";
}

export function AdminMessagingShell({ currentAdminId }: { currentAdminId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeUserId = searchParams.get("user");

  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const fetchConversations = useCallback(() => {
    return fetch("/api/messages/conversations")
      .then((r) => r.json())
      .then((json: { data: ConversationRow[] }) => {
        setConversations(json.data ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    const res = await fetch("/api/messages/users");
    const json = await res.json() as { data: UserRow[] };
    setAllUsers(json.data ?? []);
    setUsersLoading(false);
  }, []);

  // Fetched on mount (not just when the picker opens) so the header can
  // resolve a real name for a freshly-selected, not-yet-messaged user.
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function openPicker() {
    setPickerOpen(true);
  }

  function selectUser(userId: string) {
    setPickerOpen(false);
    setUserSearch("");
    router.push(`/messaging?user=${userId}`);
  }

  async function handleClaim(conv: ConversationRow, e?: React.MouseEvent) {
    e?.stopPropagation();
    const isMine = conv.handled_by === currentAdminId;
    const action = isMine ? "release" : "claim";
    setClaimingId(conv.id);
    await fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: conv.id, action }),
    });
    await fetchConversations();
    setClaimingId(null);
  }

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const name = c.profiles?.full_name ?? c.profiles?.email ?? "";
    return name.toLowerCase().includes(q);
  });

  const filteredUsers = allUsers.filter((u) => {
    const q = userSearch.toLowerCase();
    if (!q) return true;
    return (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  });

  const activeConv = conversations.find((c) => c.user_id === activeUserId);
  const activeUser = allUsers.find((u) => u.id === activeUserId);
  const activeContactName =
    activeConv?.profiles?.full_name ??
    activeConv?.profiles?.email ??
    activeUser?.full_name ??
    activeUser?.email ??
    "";
  const activeContactRole = activeConv?.profiles?.role ?? activeUser?.role ?? null;
  const activeContactRoleLabel = activeContactRole ? getRoleLabel(activeContactRole) : undefined;

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xl border border-card-border bg-card shadow-[var(--shadow-card)]">

      {/* ── Left sidebar ── */}
      <div
        className={`w-full shrink-0 flex-col border-r border-card-border bg-bio-green-dark sm:flex sm:w-72 ${
          activeUserId ? "hidden" : "flex"
        }`}
      >

        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">Messages</h2>
          <button
            type="button"
            onClick={openPicker}
            title="New conversation"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-white/10">
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-white/50" />
            <input
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="space-y-1 px-2 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-white/10" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-6 text-xs text-white/40 text-center">
              {search ? "No results." : "No conversations yet."}
            </p>
          ) : (
            filtered.map((conv) => {
              const name = conv.profiles?.full_name ?? conv.profiles?.email ?? "Unknown";
              const role = conv.profiles?.role;
              const isActive = conv.user_id === activeUserId;
              const handledByMe = conv.handled_by === currentAdminId;
              const handledByOther = conv.handled_by && !handledByMe;
              const handler = handlerLabel(conv.handler);

              return (
                <div
                  key={conv.id}
                  className={`group relative flex flex-col px-3 py-2.5 transition-colors cursor-pointer ${
                    isActive ? "bg-white/20" : "hover:bg-white/10"
                  }`}
                  onClick={() => router.push(`/messaging?user=${conv.user_id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isActive ? "bg-white text-bio-green" : "bg-white/20 text-white"
                    }`}>
                      {getInitials(conv.profiles?.full_name ?? null, conv.profiles?.email ?? null)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-sm truncate ${conv.unread_by_admin ? "font-semibold text-white" : "font-medium text-white/80"}`}>
                          {name}
                        </span>
                        <span className="text-[10px] text-white/40 shrink-0">{timeAgo(conv.last_message_at)}</span>
                      </div>
                      {role && (
                        <span className="text-[11px] text-white/50">{getRoleLabel(role)}</span>
                      )}
                    </div>

                    {conv.unread_by_admin && (
                      <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                    )}
                  </div>

                  {/* Handler badge + claim button */}
                  <div className="mt-1 flex items-center justify-between pl-11">
                    {handledByMe ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-300">
                        <UserCheck className="h-3 w-3" />
                        You are handling
                      </span>
                    ) : handledByOther ? (
                      <span className="flex items-center gap-1 text-[10px] text-white/40">
                        <UserCheck className="h-3 w-3" />
                        {handler}
                      </span>
                    ) : (
                      <span className="text-[10px] text-white/25">Unassigned</span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => void handleClaim(conv, e)}
                      disabled={claimingId === conv.id}
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 ${
                        handledByMe
                          ? "bg-white/10 text-white/60 hover:bg-white/20"
                          : "bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/50"
                      }`}
                    >
                      {claimingId === conv.id ? "…" : handledByMe ? "Release" : handledByOther ? "Take over" : "Claim"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right chat panel ── */}
      <div
        className={`flex-1 flex-col min-w-0 min-h-0 sm:flex ${
          activeUserId ? "flex" : "hidden"
        }`}
      >
        {activeUserId ? (
          <>
            {/* Handler status bar */}
            {activeConv && (
              <div className="flex items-center justify-between border-b border-card-border bg-bio-mint/20 px-4 py-2 shrink-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => router.push("/messaging")}
                    className="flex items-center text-bio-text-muted hover:text-bio-green sm:hidden shrink-0"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Link
                    href={`/admin/users/${activeUserId}`}
                    className="flex items-center gap-1 text-xs font-medium text-bio-green hover:underline shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View profile
                  </Link>
                  <span className="text-bio-text-muted/40 text-xs">·</span>
                  {activeConv.handled_by === currentAdminId ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-bio-green">
                    <UserCheck className="h-3.5 w-3.5" />
                    You are handling this conversation
                  </span>
                ) : activeConv.handled_by ? (
                  <span className="flex items-center gap-1.5 text-xs text-bio-text-muted">
                    <UserCheck className="h-3.5 w-3.5" />
                    Handled by {handlerLabel(activeConv.handler)}
                  </span>
                  ) : (
                    <span className="text-xs text-bio-text-muted/60">Unassigned</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void handleClaim(activeConv)}
                  disabled={claimingId === activeConv.id}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    activeConv.handled_by === currentAdminId
                      ? "border border-gray-300 text-bio-text-muted hover:bg-gray-100"
                      : "bg-bio-green px-3 py-1 text-white hover:bg-bio-green/90"
                  }`}
                >
                  {claimingId === activeConv.id
                    ? "…"
                    : activeConv.handled_by === currentAdminId
                    ? "Release"
                    : activeConv.handled_by
                    ? "Take over"
                    : "Claim conversation"}
                </button>
              </div>
            )}

            <MessageThread
              key={activeUserId}
              userId={activeUserId}
              isAdminView
              contactName={activeContactName}
              contactRoleLabel={activeContactRoleLabel}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bio-mint/40 text-3xl">
              💬
            </div>
            <p className="text-base font-semibold text-bio-text">Select a conversation</p>
            <p className="text-sm text-bio-text-muted max-w-xs">
              Choose a user from the sidebar to view their messages, or start a new conversation.
            </p>
            <button
              type="button"
              onClick={openPicker}
              className="mt-2 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90"
            >
              + New conversation
            </button>
          </div>
        )}
      </div>

      {/* ── New conversation picker overlay ── */}
      {pickerOpen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30" onClick={() => setPickerOpen(false)}>
          <div
            className="w-full max-w-sm rounded-xl border border-card-border bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-card-border px-4 py-3">
              <h3 className="text-sm font-semibold text-bio-text">New conversation</h3>
              <button type="button" onClick={() => setPickerOpen(false)} className="text-bio-text-muted hover:text-bio-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-card-border">
              <input
                autoFocus
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-bio-green/40"
                placeholder="Search by name or email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {usersLoading ? (
                <p className="px-4 py-4 text-sm text-bio-text-muted">Loading…</p>
              ) : filteredUsers.length === 0 ? (
                <p className="px-4 py-4 text-sm text-bio-text-muted">No users found.</p>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => selectUser(u.id)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-bio-mint/20 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bio-green/10 text-xs font-semibold text-bio-green">
                      {getInitials(u.full_name, u.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-bio-text truncate">{u.full_name ?? u.email}</p>
                      <p className="text-xs text-bio-text-muted">{getRoleLabel(u.role)} {u.full_name && u.email ? `· ${u.email}` : ""}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
