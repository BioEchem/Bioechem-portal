"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";

type ImageRow = {
  id: string;
  url: string;
  filename: string;
  position: number;
};

type Props = {
  eventId: string;
  images: ImageRow[];
  onChange: (images: ImageRow[]) => void;
};

export function PhotoManager({ eventId, images, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const newImages: ImageRow[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/admin/content/past-events/${eventId}/images`, {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        newImages.push(json.data as ImageRow);
      }
      onChange([...images, ...newImages]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(imageId: string) {
    setDeletingId(imageId);
    try {
      const res = await fetch(
        `/api/admin/content/past-events/${eventId}/images/${imageId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Delete failed");
      }
      onChange(images.filter((img) => img.id !== imageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-lg border border-card-border px-3 py-2 text-sm text-bio-text-muted hover:border-bio-green hover:text-bio-green disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading…" : "Upload photos"}
        </button>
        <span className="text-xs text-bio-text-muted">JPEG, PNG, WebP, GIF · max 10 MB each</span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}

      {images.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-card-border py-8 text-bio-text-muted/50">
          <ImageIcon className="h-8 w-8" />
          <p className="text-sm">No photos yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((img) => (
              <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-card-border bg-bio-mint/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.filename}
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => handleDelete(img.id)}
                  disabled={deletingId === img.id}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 disabled:opacity-50"
                  title="Delete photo"
                >
                  {deletingId === img.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
                <div className="absolute inset-x-0 bottom-0 truncate bg-black/40 px-1.5 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {img.filename}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
