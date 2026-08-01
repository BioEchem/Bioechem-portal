"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PortalCard } from "@/components/portal/portal-page";
import { getRoleLabel } from "@/lib/profile/display";

type ConversationRow = {
  id: string;
  user_id: string;
  last_message_at: string | null;
  unread_by_admin: boolean;
  profiles: { full_name: string | null; email: string | null; role: string | null } | null;
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

export function AdminConversationList() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  // New conversation picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  function fetchConversations() {
    return fetch("/api/messages/conversations")
      .then((r) => r.json())
      .then((json: { data: ConversationRow[] }) => {
        setConversations(json.data ?? []);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close picker on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function openPicker() {
    setPickerOpen(true);
    if (allUsers.length > 0) return;
    setUsersLoading(true);
    const res = await fetch("/api/messages/users");
    const json = await res.json() as { data: UserRow[] };
    setAllUsers(json.data ?? []);
    setUsersLoading(false);
  }

  async function startConversation(userId: string) {
    setPickerOpen(false);
    setSearch("");
    // Navigate to that user's thread — the page will upsert the conversation on load
    router.push(`/messaging/${userId}`);
  }

  const existingUserIds = new Set(conversations.map((c) => c.user_id));
  const filtered = allUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || !q)
    );
  });

  if (loading) {
    return (
      <PortalCard>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-bio-mint/40" />
          ))}
        </div>
      </PortalCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner + new conversation button */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-card-border bg-card px-4 py-3">
        <p className="text-xs text-bio-text-muted leading-relaxed">
          All BioEchem admins share this inbox. Any admin can read and reply to any conversation — replies show the responding admin&apos;s name.
        </p>
        <div className="relative shrink-0" ref={pickerRef}>
          <button
            type="button"
            onClick={openPicker}
            className="rounded-lg bg-bio-green px-3 py-1.5 text-xs font-medium text-white hover:bg-bio-green/90 whitespace-nowrap"
          >
            + New conversation
          </button>

          {pickerOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-72 rounded-xl border border-card-border bg-white shadow-lg">
              <div className="p-2 border-b border-card-border">
                <input
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-bio-green/50"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="max-h-56 overflow-y-auto">
                {usersLoading ? (
                  <p className="p-3 text-xs text-bio-text-muted">Loading users…</p>
                ) : filtered.length === 0 ? (
                  <p className="p-3 text-xs text-bio-text-muted">No users found.</p>
                ) : (
                  filtered.map((u) => {
                    const hasConv = existingUserIds.has(u.id);
                    const name = u.full_name ?? u.email ?? "Unknown";
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => startConversation(u.id)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-bio-mint/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-bio-text truncate">{name}</p>
                          <p className="text-xs text-bio-text-muted">
                            {getRoleLabel(u.role)}
                            {u.full_name && u.email ? ` · ${u.email}` : ""}
                          </p>
                        </div>
                        {hasConv && (
                          <span className="shrink-0 text-[10px] text-bio-text-muted border border-card-border rounded px-1 py-0.5">
                            existing
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <PortalCard>
        {conversations.length === 0 ? (
          <p className="text-sm text-bio-text-muted">
            No conversations yet. Use &ldquo;+ New conversation&rdquo; to message a user, or wait for users to reach out.
          </p>
        ) : (
          <div className="divide-y divide-card-border">
            {conversations.map((conv) => {
              const name = conv.profiles?.full_name ?? conv.profiles?.email ?? "Unknown user";
              const role = conv.profiles?.role ?? null;
              return (
                <Link
                  key={conv.id}
                  href={`/messaging/${conv.user_id}`}
                  className="flex items-center justify-between py-3 gap-3 hover:bg-bio-mint/20 -mx-6 px-6 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        conv.unread_by_admin
                          ? "bg-bio-green"
                          : "bg-transparent border border-card-border"
                      }`}
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-sm truncate ${
                          conv.unread_by_admin
                            ? "font-semibold text-bio-text"
                            : "font-medium text-bio-text"
                        }`}
                      >
                        {name}
                      </p>
                      {role ? (
                        <p className="text-xs text-bio-text-muted">{getRoleLabel(role)}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {conv.unread_by_admin && (
                      <span className="mb-0.5 block rounded-full bg-bio-green px-1.5 py-0.5 text-[10px] font-semibold text-white text-center">
                        New
                      </span>
                    )}
                    {conv.last_message_at ? (
                      <p className="text-xs text-bio-text-muted">
                        {new Date(conv.last_message_at).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-xs text-bio-text-muted">No messages</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </PortalCard>
    </div>
  );
}
