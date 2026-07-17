"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Folder, Loader2, Mail, Upload, X } from "lucide-react";
import { PortalCard } from "@/components/portal/portal-page";
import { PARTNER_FOLDER_CATEGORIES, partnerTypeLabel } from "@/lib/partner/folder-categories";

type PartnerSummary = {
  id: string;
  full_name: string | null;
  email: string | null;
  doc_count: number;
  partner_type: string | null;
};

type FolderDoc = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Admin-side browser: pick a partner, then upload/view docs by category. */
export function AdminPartnerFolderBrowser() {
  const [partners, setPartners] = useState<PartnerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadPartners = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/partner-docs/folders");
    const json = await res.json() as { data?: PartnerSummary[] };
    setPartners(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void loadPartners(); }, [loadPartners]);

  const active = partners.find((p) => p.id === activeId) ?? null;

  if (active) {
    return (
      <PartnerFolderDetail
        partnerId={active.id}
        partnerName={active.full_name ?? active.email ?? "Partner"}
        onBack={() => { setActiveId(null); void loadPartners(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-bio-text-muted">
          Each approved industry partner gets their own folder for meeting follow-ups, contracts, invoices, and more.
        </p>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-bio-text-muted hover:border-bio-green hover:text-bio-green"
        >
          <Mail className="h-3.5 w-3.5" /> Invite a partner
        </button>
      </div>

      {inviteOpen && <InvitePartnerCard onClose={() => setInviteOpen(false)} />}

      {loading && <p className="text-sm text-bio-text-muted">Loading…</p>}

      {!loading && partners.length === 0 && (
        <PortalCard>
          <div className="flex flex-col items-center py-10 text-center">
            <Folder className="mb-3 h-8 w-8 text-bio-text-muted" />
            <p className="text-sm text-bio-text-muted">
              No approved industry partners yet. Once a partner signs up and is approved, their folder appears here.
            </p>
          </div>
        </PortalCard>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {partners.map((p) => (
          <button
            key={p.id}
            onClick={() => setActiveId(p.id)}
            className="flex items-center gap-3 rounded-xl border border-card-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition-colors hover:border-bio-green"
          >
            <Folder className="h-8 w-8 shrink-0 text-bio-green" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate font-medium text-bio-text">{p.full_name ?? p.email ?? "Partner"}</p>
                {p.partner_type && (
                  <span className="shrink-0 rounded-full bg-bio-green/10 px-1.5 py-0.5 text-[10px] font-medium text-bio-green">
                    {partnerTypeLabel(p.partner_type)}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-bio-text-muted">{p.email}</p>
              <p className="mt-0.5 text-xs text-bio-text-muted">{p.doc_count} document{p.doc_count === 1 ? "" : "s"}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function InvitePartnerCard({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function sendInvite() {
    const signupUrl = `${window.location.origin}/auth/signup`;
    const subject = encodeURIComponent("You're invited to the BioEchem partner portal");
    const body = encodeURIComponent(
      `Hi ${name || "there"},\n\nWe'd like to invite you to BioEchem's partner portal, where you'll have your own document folder for contracts, invoices, and more.\n\nSign up here: ${signupUrl}\nPlease select "Industry Partner" as your role. We'll approve your account once you register.\n\nThanks,\nBioEchem Team`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
    onClose();
  }

  return (
    <PortalCard>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-bio-green">Invite a partner</h3>
        <button onClick={onClose} className="text-bio-text-muted hover:text-bio-text"><X className="h-4 w-4" /></button>
      </div>
      <p className="mt-1 text-xs text-bio-text-muted">
        Opens an email with a link for them to sign up as an Industry Partner. Their folder appears here automatically once you approve their account.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Contact name"
          className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
        />
        <input
          value={email} onChange={(e) => setEmail(e.target.value)}
          type="email" placeholder="Email address"
          className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
        />
      </div>
      <button
        onClick={sendInvite}
        disabled={!email}
        className="mt-3 flex items-center gap-2 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-50"
      >
        <Mail className="h-4 w-4" /> Open email invite
      </button>
    </PortalCard>
  );
}

function PartnerFolderDetail({
  partnerId,
  partnerName,
  onBack,
}: {
  partnerId: string;
  partnerName: string;
  onBack: () => void;
}) {
  const [docs, setDocs] = useState<FolderDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadCategory, setUploadCategory] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/partner-docs/folders/${partnerId}`);
    const json = await res.json() as { data?: { docs: FolderDoc[] } };
    setDocs(json.data?.docs ?? []);
    setLoading(false);
  }, [partnerId]);

  useEffect(() => { void load(); }, [load]);

  function triggerUpload(category: string) {
    setUploadCategory(category);
    setError(null);
    fileRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uploadCategory) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", uploadCategory);
      const res = await fetch(`/api/admin/partner-docs/folders/${partnerId}/upload`, { method: "POST", body: fd });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      setUploadCategory(null);
    }
  }

  async function download(doc: FolderDoc) {
    const res = await fetch(`/api/partner-docs/${doc.id}/download`);
    const json = await res.json() as { url?: string; error?: string };
    if (!res.ok || !json.url) { alert(json.error ?? "Download failed."); return; }
    const a = document.createElement("a");
    a.href = json.url;
    a.download = doc.file_name ?? "document";
    a.target = "_blank";
    a.click();
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-bio-text-muted hover:text-bio-green">&larr; All partners</button>
      <h2 className="text-lg font-semibold text-bio-text">{partnerName}&apos;s folder</h2>

      <input ref={fileRef} type="file" className="hidden" onChange={(e) => void handleFile(e)} />
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-bio-text-muted">Loading…</p>
      ) : (
        <div className="space-y-5">
          {PARTNER_FOLDER_CATEGORIES.map((cat) => {
            const items = docs.filter((d) => d.category === cat.value);
            return (
              <PortalCard key={cat.value}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-bio-green">{cat.label}</h3>
                  <button
                    onClick={() => triggerUpload(cat.value)}
                    disabled={uploading && uploadCategory === cat.value}
                    className="flex items-center gap-1.5 text-xs font-medium text-bio-text-muted hover:text-bio-green disabled:opacity-50"
                  >
                    {uploading && uploadCategory === cat.value
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Upload className="h-3.5 w-3.5" />}
                    Upload
                  </button>
                </div>
                {items.length === 0 ? (
                  <p className="mt-2 text-xs text-bio-text-muted">No documents yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {items.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-card-border px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-bio-text-muted" />
                          <div className="min-w-0">
                            <p className="truncate text-sm text-bio-text">{doc.title}</p>
                            {doc.size_bytes != null && (
                              <p className="text-xs text-bio-text-muted">{formatBytes(doc.size_bytes)}</p>
                            )}
                          </div>
                        </div>
                        <button onClick={() => void download(doc)} className="shrink-0 text-bio-text-muted hover:text-bio-green">
                          <Download className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </PortalCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
