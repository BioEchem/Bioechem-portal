"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, X } from "lucide-react";

type SheetEmails = { name: string; emails: string[] };

export function DriveEmailModal({
  fileId,
  fileName,
  onClose,
}: {
  fileId: string;
  fileName: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<SheetEmails[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/drive/${fileId}/parse-emails`);
        const json = await res.json() as { data?: { sheets: SheetEmails[] }; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Failed to parse spreadsheet.");
        if (cancelled) return;
        const parsedSheets = json.data?.sheets ?? [];
        setSheets(parsedSheets);
        setSelected(new Set(parsedSheets.flatMap((s) => s.emails)));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to parse spreadsheet.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fileId]);

  function toggleEmail(email: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email); else next.add(email);
      return next;
    });
  }

  function toggleSheet(sheet: SheetEmails, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const email of sheet.emails) {
        if (checked) next.add(email); else next.delete(email);
      }
      return next;
    });
  }

  async function handleSend() {
    if (!subject.trim() || !message.trim() || selected.size === 0) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/drive/${fileId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), emails: Array.from(selected) }),
      });
      const json = await res.json() as { data?: { sent: number }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to send.");
      setSentCount(json.data?.sent ?? selected.size);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-bio-text">
            <Mail className="h-4 w-4 text-bio-green" /> Send email — {fileName}
          </h2>
          <button onClick={onClose} className="text-bio-text-muted hover:text-bio-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-bio-text-muted" />
            </div>
          ) : sentCount !== null ? (
            <p className="py-8 text-center text-sm text-bio-text">
              Sent to <strong>{sentCount}</strong> recipient{sentCount === 1 ? "" : "s"}.
            </p>
          ) : (
            <div className="space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}

              {sheets.length === 0 ? (
                <p className="text-sm text-bio-text-muted">No email addresses found in this spreadsheet.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-bio-text-muted">
                    {selected.size} recipient{selected.size === 1 ? "" : "s"} selected
                  </p>
                  {sheets.map((sheet) => {
                    const allChecked = sheet.emails.length > 0 && sheet.emails.every((e) => selected.has(e));
                    return (
                      <div key={sheet.name} className="rounded-lg border border-card-border">
                        <div className="flex items-center justify-between border-b border-card-border bg-bio-bg px-3 py-2">
                          <span className="text-sm font-medium text-bio-text">{sheet.name}</span>
                          <label className="flex items-center gap-1.5 text-xs text-bio-text-muted">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              onChange={(e) => toggleSheet(sheet, e.target.checked)}
                              className="h-3.5 w-3.5 accent-bio-green"
                            />
                            Select all ({sheet.emails.length})
                          </label>
                        </div>
                        {sheet.emails.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-bio-text-muted">No emails found in this sheet.</p>
                        ) : (
                          <div className="max-h-32 overflow-y-auto px-3 py-2">
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {sheet.emails.map((email) => (
                                <label key={email} className="flex items-center gap-1.5 text-xs text-bio-text">
                                  <input
                                    type="checkbox"
                                    checked={selected.has(email)}
                                    onChange={() => toggleEmail(email)}
                                    className="h-3.5 w-3.5 accent-bio-green"
                                  />
                                  {email}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-bio-text-muted">Subject *</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
                  placeholder="Subject line"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-bio-text-muted">Message *</label>
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full resize-y rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
                  placeholder="Write your message…"
                />
              </div>
            </div>
          )}
        </div>

        {!loading && sentCount === null && (
          <div className="flex items-center justify-end gap-3 border-t border-card-border px-5 py-4">
            <button onClick={onClose} disabled={sending}
              className="rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text disabled:opacity-60">
              Cancel
            </button>
            <button
              onClick={() => void handleSend()}
              disabled={sending || selected.size === 0 || !subject.trim() || !message.trim()}
              className="flex items-center gap-2 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              {sending ? "Sending…" : `Send to ${selected.size}`}
            </button>
          </div>
        )}
        {sentCount !== null && (
          <div className="flex items-center justify-end gap-3 border-t border-card-border px-5 py-4">
            <button onClick={onClose} className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
