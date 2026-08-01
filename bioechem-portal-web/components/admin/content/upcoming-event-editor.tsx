"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export type UpcomingEventRow = {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  link: string | null;
  published: boolean;
  position: number;
  created_at: string;
};

type Props = {
  mode: "create" | "edit";
  initial?: Partial<UpcomingEventRow>;
  onSave: (data: Partial<UpcomingEventRow>) => Promise<UpcomingEventRow>;
  onCancel: () => void;
};

export function UpcomingEventEditor({ mode, initial = {}, onSave, onCancel }: Props) {
  const [title, setTitle]       = useState(initial.title ?? "");
  const [date, setDate]         = useState(initial.date ?? "");
  const [location, setLocation] = useState(initial.location ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [link, setLink]         = useState(initial.link ?? "");
  const [published, setPublished] = useState(initial.published ?? false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ title, date, location, description, link: link.trim() || null, published });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-card-border px-3 py-2 text-sm focus:border-bio-green focus:outline-none";

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Title *</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Date *</label>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Location *</label>
          <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} required />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Description *</label>
          <textarea rows={3} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Registration / info link (optional)</label>
          <input type="url" className={inputCls} placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        Publish on landing page
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Create event" : "Save changes"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-bio-text-muted hover:text-bio-green">
          Cancel
        </button>
      </div>
    </form>
  );
}
