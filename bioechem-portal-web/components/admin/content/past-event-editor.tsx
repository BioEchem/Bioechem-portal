"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Plus, X } from "lucide-react";

export type PastEventRow = {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  highlights: string[];
  link: string | null;
  published: boolean;
  position: number;
  created_at: string;
  event_images: { id: string; url: string; filename: string; position: number }[];
};

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  initial?: Partial<PastEventRow>;
  /** Returns the saved row so the editor can upload photos against its id. */
  onSave: (data: Partial<PastEventRow>) => Promise<PastEventRow>;
  onCancel: () => void;
};

async function uploadPhoto(eventId: string, file: File): Promise<{ id: string; url: string; filename: string; position: number }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/admin/content/past-events/${eventId}/images`, {
    method: "POST",
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Upload failed for ${file.name}`);
  return json.data;
}

export function PastEventEditor({ mode, initial = {}, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [date, setDate] = useState(initial.date ?? "");
  const [location, setLocation] = useState(initial.location ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [link, setLink] = useState(initial.link ?? "");
  const [published, setPublished] = useState(initial.published ?? false);
  const [highlights, setHighlights] = useState<string[]>(
    initial.highlights && initial.highlights.length > 0 ? initial.highlights : [""]
  );
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function addHighlight() { setHighlights((h) => [...h, ""]); }
  function removeHighlight(i: number) { setHighlights((h) => h.filter((_, idx) => idx !== i)); }
  function updateHighlight(i: number, val: string) {
    setHighlights((h) => h.map((v, idx) => (idx === i ? val : v)));
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    setPendingPhotos((p) => [...p, ...Array.from(files)]);
    if (fileRef.current) fileRef.current.value = "";
  }
  function removePhoto(i: number) {
    setPendingPhotos((p) => p.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(mode === "create" ? "Creating…" : "Saving…");
    try {
      const saved = await onSave({
        title,
        date,
        location,
        description,
        link: link || null,
        published,
        highlights: highlights.filter((h) => h.trim() !== ""),
      });

      if (pendingPhotos.length > 0) {
        for (let i = 0; i < pendingPhotos.length; i++) {
          setStatus(`Uploading photo ${i + 1} of ${pendingPhotos.length}…`);
          await uploadPhoto(saved.id, pendingPhotos[i]);
        }
        setPendingPhotos([]);
      }
      setStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setStatus(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">Title *</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
          placeholder="Annual BioEChem Symposium"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Date *</label>
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Location *</label>
          <input
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
            placeholder="New York, NY"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">Description *</label>
        <textarea
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
          placeholder="Brief description of the event…"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">Link (optional)</label>
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
          placeholder="https://…"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-bio-text-muted">Highlights</label>
          <button type="button" onClick={addHighlight} className="flex items-center gap-1 text-xs text-bio-green hover:underline">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={h}
                onChange={(e) => updateHighlight(i, e.target.value)}
                className="flex-1 rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
                placeholder="e.g. 200+ attendees"
              />
              <button type="button" onClick={() => removeHighlight(i)} className="text-bio-text-muted hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Photo upload */}
      <div>
        <label className="mb-2 block text-xs font-medium text-bio-text-muted">
          Photos <span className="font-normal">(optional — you can also add more later)</span>
        </label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-dashed border-card-border px-4 py-2.5 text-sm text-bio-text-muted hover:border-bio-green hover:text-bio-green"
        >
          <ImageIcon className="h-4 w-4" /> Choose photos
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addPhotos(e.target.files)}
        />
        <p className="mt-1 text-xs text-bio-text-muted">JPEG, PNG, WebP, GIF · max 10 MB each · multiple allowed</p>

        {pendingPhotos.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {pendingPhotos.map((f, i) => (
              <div key={i} className="group relative flex items-center gap-2 rounded-lg border border-card-border bg-bio-mint/20 px-2 py-1.5">
                <ImageIcon className="h-4 w-4 shrink-0 text-bio-green/60" />
                <span className="min-w-0 flex-1 truncate text-xs text-bio-text">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="shrink-0 text-bio-text-muted hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
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
          {status ?? (mode === "create" ? "Create event" : "Save changes")}
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
