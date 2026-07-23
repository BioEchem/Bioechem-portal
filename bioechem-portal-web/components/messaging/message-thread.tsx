"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { getShortInitials as getInitials } from "@/lib/profile/display";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  sent_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

type Props = {
  userId: string;
  isAdminView?: boolean;
  contactName?: string;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageThread({ userId, isAdminView = false, contactName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevCountRef = useRef(0);

  const fetchMessages = useCallback(async () => {
    const url = isAdminView ? `/api/messages?user_id=${userId}` : "/api/messages";
    const res = await fetch(url);
    if (!res.ok) return;
    const json = await res.json() as { data: { messages: Message[] } };
    setMessages(json.data.messages);
    setLoading(false);
  }, [userId, isAdminView]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Only scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length !== prevCountRef.current) {
      prevCountRef.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    setInput("");

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: text,
        ...(isAdminView ? { target_user_id: userId } : {}),
      }),
    });

    if (!res.ok) {
      const json = await res.json() as { error?: string };
      setError(json.error ?? "Failed to send.");
      setInput(text); // restore
    }

    setSending(false);
    await fetchMessages();
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  // Group consecutive messages from same sender
  type GroupedMsg = Message & { showAvatar: boolean; showSender: boolean };
  const grouped: GroupedMsg[] = messages.map((msg, i) => {
    const prev = messages[i - 1];
    const sameAsPrev = prev?.sender_id === msg.sender_id;
    return { ...msg, showAvatar: !sameAsPrev, showSender: !sameAsPrev };
  });

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-bio-green border-t-transparent" />
        <p className="text-sm text-bio-text-muted">Loading conversation…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-card-border bg-card px-4 py-3 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bio-green text-xs font-semibold text-white">
          {isAdminView
            ? getInitials(contactName ?? null, null)
            : "BA"}
        </div>
        <div>
          <p className="text-sm font-semibold text-bio-text">
            {isAdminView ? (contactName ?? "User") : "BioEchem Admin"}
          </p>
          <p className="text-[11px] text-bio-text-muted">
            {isAdminView ? "Portal user" : "Support & communication"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bio-mint/50 text-bio-green text-xl">
              💬
            </div>
            <p className="text-sm font-medium text-bio-text">No messages yet</p>
            <p className="text-xs text-bio-text-muted">
              {isAdminView ? "Send a message to start the conversation." : "Send a message to BioEchem Admin to get started."}
            </p>
          </div>
        ) : (
          grouped.map((msg) => {
            const isMine = isAdminView ? msg.sender_id !== userId : msg.sender_id === userId;
            const senderName = msg.profiles?.full_name ?? msg.profiles?.email ?? "Unknown";
            // Student view: non-mine msgs are always from BioEchem Admin — show "BA" if profile missing
            const initials = (!isAdminView && !isMine)
              ? "BA"
              : getInitials(msg.profiles?.full_name ?? null, msg.profiles?.email ?? null);

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"} ${msg.showAvatar ? "mt-3" : "mt-0.5"}`}
              >
                {/* Avatar */}
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                  msg.showAvatar ? "opacity-100" : "opacity-0"
                } ${isMine ? "bg-bio-green text-white" : "bg-bio-mint text-bio-green"}`}>
                  {initials}
                </div>

                <div className={`flex flex-col gap-0.5 max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
                  {msg.showSender && (
                    <span className={`text-[11px] font-medium text-bio-text-muted px-1 ${isMine ? "text-right" : "text-left"}`}>
                      {isMine ? "You" : (isAdminView ? senderName : "BioEchem Admin")}
                      <span className="ml-1.5 font-normal">{formatTime(msg.sent_at)}</span>
                    </span>
                  )}
                  <div className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    isMine
                      ? "bg-bio-green text-white rounded-br-sm"
                      : "bg-white border border-card-border text-bio-text rounded-bl-sm shadow-sm"
                  }`}>
                    {msg.body}
                  </div>
                  {!msg.showSender && (
                    <span className="text-[10px] text-bio-text-muted/60 px-1 opacity-0 hover:opacity-100 transition-opacity">
                      {formatTime(msg.sent_at)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <p className="px-4 pb-1 text-xs text-red-600">{error}</p>
      )}

      {/* Composer */}
      <div className="border-t border-card-border bg-card px-4 py-3 shrink-0">
        <div className="flex items-end gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 focus-within:border-bio-green focus-within:ring-2 focus-within:ring-bio-green/30">
          <textarea
            ref={textareaRef}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            placeholder="Message BioEchem Admin… (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            style={{ minHeight: "24px", maxHeight: "120px" }}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bio-green text-white transition-colors hover:bg-bio-green/90 disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-[10px] text-bio-text-muted/60">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
