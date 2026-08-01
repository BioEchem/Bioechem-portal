"use client";

import { useRef, useState } from "react";
import { FileText, FileVideo, Loader2, Trash2, Upload, X } from "lucide-react";

export type NewsletterRow = {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  body: string | null;
  pdf_url: string | null;
  video_url: string | null;
  visible_to: string[];
  published: boolean;
  created_at: string;
};

const ROLE_OPTIONS = [
  { value: "participant",      label: "Participants" },
  { value: "teacher",          label: "Teachers" },
  { value: "school_admin",     label: "School admins" },
  { value: "industry_partner", label: "Industry partners" },
  { value: "shareholder",      label: "Shareholders" },
] as const;

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  initial?: Partial<NewsletterRow>;
  onSave: (data: Partial<NewsletterRow>) => Promise<NewsletterRow>;
  onCancel: () => void;
};

async function uploadPdf(newsletterId: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/admin/content/newsletters/${newsletterId}/upload`, {
    method: "POST",
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "PDF upload failed");
  return json.url as string;
}

async function uploadVideo(newsletterId: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/admin/content/newsletters/${newsletterId}/video`, {
    method: "POST",
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Video upload failed");
  return json.url as string;
}

async function deleteVideo(newsletterId: string): Promise<void> {
  const res = await fetch(`/api/admin/content/newsletters/${newsletterId}/video`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error ?? "Failed to remove video");
  }
}

export function NewsletterEditor({ mode, initial = {}, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [date, setDate] = useState(initial.date ?? "");
  const [excerpt, setExcerpt] = useState(initial.excerpt ?? "");
  const [body, setBody] = useState(initial.body ?? "");
  const [published, setPublished] = useState(initial.published ?? false);
  const [visibleTo, setVisibleTo] = useState<string[]>(initial.visible_to ?? []);
  const [pendingPdf, setPendingPdf] = useState<File | null>(null);
  const [pendingVideo, setPendingVideo] = useState<File | null>(null);
  const [removeVideo, setRemoveVideo] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(mode === "create" ? "Creating…" : "Saving…");
    try {
      const saved = await onSave({ title, date, excerpt, body: body || null, published, visible_to: visibleTo });

      if (pendingPdf) {
        setStatus("Uploading PDF…");
        await uploadPdf(saved.id, pendingPdf);
        setPendingPdf(null);
      }

      if (removeVideo && !pendingVideo) {
        setStatus("Removing video…");
        await deleteVideo(saved.id);
        setRemoveVideo(false);
      }

      if (pendingVideo) {
        setStatus("Uploading video…");
        await uploadVideo(saved.id, pendingVideo);
        setPendingVideo(null);
        setRemoveVideo(false);
      }

      setStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setStatus(null);
    }
  }

  const hasCurrentVideo = initial.video_url && !removeVideo;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">Title *</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
          placeholder="Spring 2026 Newsletter"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">Date *</label>
        <input
          required
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">
          Excerpt * <span className="font-normal">(short summary shown in the list)</span>
        </label>
        <textarea
          required
          rows={2}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
          placeholder="A brief summary of what's in this newsletter…"
        />
      </div>

      {/* PDF upload */}
      <div>
        <label className="mb-2 block text-xs font-medium text-bio-text-muted">
          PDF <span className="font-normal">(optional)</span>
        </label>
        {initial.pdf_url && !pendingPdf ? (
          <div className="flex items-center gap-3">
            <a
              href={initial.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-bio-green hover:underline"
            >
              <FileText className="h-4 w-4" /> Current PDF
            </a>
            <button
              type="button"
              onClick={() => pdfRef.current?.click()}
              className="text-xs text-bio-text-muted hover:text-bio-green"
            >
              Replace
            </button>
          </div>
        ) : pendingPdf ? (
          <div className="flex items-center gap-2 rounded-lg border border-bio-green/30 bg-bio-mint/30 px-3 py-2 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-bio-green" />
            <span className="flex-1 truncate text-bio-text">{pendingPdf.name}</span>
            <span className="shrink-0 text-xs text-bio-text-muted">
              {(pendingPdf.size / 1024 / 1024).toFixed(1)} MB
            </span>
            <button
              type="button"
              onClick={() => { setPendingPdf(null); if (pdfRef.current) pdfRef.current.value = ""; }}
              className="shrink-0 text-bio-text-muted hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => pdfRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-dashed border-card-border px-4 py-2.5 text-sm text-bio-text-muted hover:border-bio-green hover:text-bio-green"
          >
            <Upload className="h-4 w-4" /> Choose PDF
          </button>
        )}
        <input
          ref={pdfRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingPdf(f); }}
        />
        <p className="mt-1 text-xs text-bio-text-muted">Max 20 MB · PDF only</p>
      </div>

      {/* Video upload */}
      <div>
        <label className="mb-2 block text-xs font-medium text-bio-text-muted">
          Video <span className="font-normal">(optional — embedded player shown to readers)</span>
        </label>
        {hasCurrentVideo ? (
          <div className="space-y-2">
            <video
              src={initial.video_url!}
              controls
              className="w-full max-w-md rounded-lg border border-card-border"
              style={{ maxHeight: 200 }}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => videoRef.current?.click()}
                className="text-xs text-bio-text-muted hover:text-bio-green"
              >
                Replace video
              </button>
              <button
                type="button"
                onClick={() => setRemoveVideo(true)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove video
              </button>
            </div>
          </div>
        ) : pendingVideo ? (
          <div className="flex items-center gap-2 rounded-lg border border-bio-green/30 bg-bio-mint/30 px-3 py-2 text-sm">
            <FileVideo className="h-4 w-4 shrink-0 text-bio-green" />
            <span className="flex-1 truncate text-bio-text">{pendingVideo.name}</span>
            <span className="shrink-0 text-xs text-bio-text-muted">
              {(pendingVideo.size / 1024 / 1024).toFixed(1)} MB
            </span>
            <button
              type="button"
              onClick={() => { setPendingVideo(null); if (videoRef.current) videoRef.current.value = ""; }}
              className="shrink-0 text-bio-text-muted hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : removeVideo ? (
          <div className="flex items-center gap-3 text-sm text-amber-700">
            <span>Video will be removed on save.</span>
            <button
              type="button"
              onClick={() => setRemoveVideo(false)}
              className="text-xs text-bio-text-muted hover:text-bio-green"
            >
              Undo
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => videoRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-dashed border-card-border px-4 py-2.5 text-sm text-bio-text-muted hover:border-bio-green hover:text-bio-green"
          >
            <Upload className="h-4 w-4" /> Choose video
          </button>
        )}
        <input
          ref={videoRef}
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { setPendingVideo(f); setRemoveVideo(false); }
          }}
        />
        <p className="mt-1 text-xs text-bio-text-muted">Max 100 MB · MP4, WebM, OGG, or MOV</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">
          Body text <span className="font-normal">(optional — shown if no PDF)</span>
        </label>
        <textarea
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
          placeholder={"# Heading\n\nParagraph text…\n\n## Subheading\n\nMore text…"}
        />
        <p className="mt-1 text-xs text-bio-text-muted">Use # for headings, ## for subheadings. Blank lines create paragraphs.</p>
      </div>

      {/* Audience */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-bio-text-muted">
          Visible to <span className="font-normal">(leave all unchecked to show everyone)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-card-border px-3 py-1 text-xs transition-colors hover:border-bio-green has-[:checked]:border-bio-green has-[:checked]:bg-bio-green/10 has-[:checked]:text-bio-green"
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={visibleTo.includes(opt.value)}
                onChange={() =>
                  setVisibleTo((prev) =>
                    prev.includes(opt.value)
                      ? prev.filter((r) => r !== opt.value)
                      : [...prev, opt.value]
                  )
                }
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 rounded border-card-border accent-bio-green"
        />
        <span className="text-bio-text">Published (visible on landing page)</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={!!status}
          className="flex items-center gap-2 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60"
        >
          {status ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {status ?? (mode === "create" ? "Create" : "Save changes")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={!!status}
          className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-bio-text-muted hover:text-bio-text disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function DeleteButton({ label, onDelete }: { label: string; onDelete: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); setConfirm(false); }
  }

  if (confirm) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs text-red-600">Delete {label}?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
        >
          {deleting ? "Deleting…" : "Yes, delete"}
        </button>
        <button onClick={() => setConfirm(false)} className="text-xs text-bio-text-muted hover:underline">
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center gap-1 text-xs text-bio-text-muted hover:text-red-600"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Delete
    </button>
  );
}
