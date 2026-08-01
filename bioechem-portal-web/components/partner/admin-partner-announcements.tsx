"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, Megaphone, Send, Upload, X } from "lucide-react";
import { PortalCard } from "@/components/portal/portal-page";
import { formatBytes } from "@/lib/format/bytes";
import { formatShortDate as fmt } from "@/lib/format/date";

type PartnerOption = { id: string; full_name: string | null; email: string | null };

type SentAnnouncement = {
  id: string;
  title: string;
  body: string;
  target: string;
  target_partner_id: string | null;
  storage_path: string | null;
  file_name: string | null;
  size_bytes: number | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

const TARGET_LABELS: Record<string, string> = {
  all: "All partners",
  industry: "Industry partners",
  government: "Government partners",
  specific: "Specific partner",
};

export function AdminPartnerAnnouncements() {
  const [sent, setSent] = useState<SentAnnouncement[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [sentRes, partnersRes] = await Promise.all([
      fetch("/api/admin/partner-announcements"),
      fetch("/api/admin/partner-docs/folders"),
    ]);
    const sentJson = await sentRes.json() as { data?: SentAnnouncement[] };
    const partnersJson = await partnersRes.json() as { data?: PartnerOption[] };
    setSent(sentJson.data ?? []);
    setPartners(partnersJson.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-bio-text-muted">
          Send a message to all partners, one partner type, or a specific partner — with an optional file attached.
        </p>
        {!composing && (
          <button
            onClick={() => setComposing(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90"
          >
            <Send className="h-4 w-4" /> New announcement
          </button>
        )}
      </div>

      {composing && (
        <ComposeForm
          partners={partners}
          onSent={() => { setComposing(false); void load(); }}
          onCancel={() => setComposing(false)}
        />
      )}

      {loading && <p className="text-sm text-bio-text-muted">Loading…</p>}

      {!loading && sent.length === 0 && !composing && (
        <PortalCard>
          <div className="flex flex-col items-center py-10 text-center">
            <Megaphone className="mb-3 h-8 w-8 text-bio-text-muted" />
            <p className="text-sm text-bio-text-muted">No announcements sent yet.</p>
          </div>
        </PortalCard>
      )}

      {sent.map((a) => (
        <PortalCard key={a.id}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-bio-text">{a.title}</span>
            <span className="rounded-full border border-card-border px-2 py-0.5 text-xs text-bio-text-muted">
              {a.target === "specific"
                ? `Sent to ${a.profiles?.full_name ?? a.profiles?.email ?? "one partner"}`
                : TARGET_LABELS[a.target] ?? a.target}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-bio-text-muted">{a.body}</p>
          {a.file_name && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-bio-text-muted">
              <FileText className="h-3.5 w-3.5" /> {a.file_name}
              {a.size_bytes != null && ` · ${formatBytes(a.size_bytes)}`}
            </p>
          )}
          <p className="mt-2 text-xs text-bio-text-muted">{fmt(a.created_at)}</p>
        </PortalCard>
      ))}
    </div>
  );
}

function ComposeForm({
  partners,
  onSent,
  onCancel,
}: {
  partners: PartnerOption[];
  onSent: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "industry" | "government" | "specific">("all");
  const [targetPartnerId, setTargetPartnerId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) { setError("Title and message are required."); return; }
    if (target === "specific" && !targetPartnerId) { setError("Pick a partner to send to."); return; }
    setError(null);
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("body", body.trim());
      fd.append("target", target);
      if (target === "specific") fd.append("targetPartnerId", targetPartnerId);
      if (file) fd.append("file", file);

      const res = await fetch("/api/admin/partner-announcements", { method: "POST", body: fd });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to send.");
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <PortalCard>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Title *</label>
          <input
            required value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
            placeholder="Q3 partner update"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Message *</label>
          <textarea
            required rows={4} value={body} onChange={(e) => setBody(e.target.value)}
            className="w-full resize-y rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
            placeholder="Write your announcement…"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-bio-text-muted">Send to</label>
          <div className="flex flex-wrap gap-4 text-sm">
            {(["all", "industry", "government", "specific"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2">
                <input type="radio" checked={target === t} onChange={() => setTarget(t)} className="h-4 w-4 accent-bio-green" />
                <span className="text-bio-text">{TARGET_LABELS[t]}</span>
              </label>
            ))}
          </div>
          {target === "specific" && (
            <select
              value={targetPartnerId}
              onChange={(e) => setTargetPartnerId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
            >
              <option value="">— Select a partner —</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-bio-text-muted">Attach a file (optional)</label>
          {file ? (
            <div className="flex items-center gap-2 rounded-lg border border-bio-green/30 bg-bio-mint/30 px-3 py-2 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-bio-green" />
              <span className="flex-1 truncate">{file.name}</span>
              <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
                <X className="h-4 w-4 text-bio-text-muted hover:text-red-600" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-dashed border-card-border px-4 py-2.5 text-sm text-bio-text-muted hover:border-bio-green hover:text-bio-green">
              <Upload className="h-4 w-4" /> Choose file
            </button>
          )}
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={sending}
            className="flex items-center gap-2 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? "Sending…" : "Send announcement"}
          </button>
          <button type="button" onClick={onCancel} disabled={sending}
            className="rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text disabled:opacity-60">
            Cancel
          </button>
        </div>
      </form>
    </PortalCard>
  );
}
