"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ProfileSection } from "@/components/profile/profile-section";
import { getInitials } from "@/lib/profile/display";
import { createClient } from "@/lib/supabase/client";
import type { AuthApiError } from "@/lib/auth/types";
import type { UpdateProfileSuccessResponse } from "@/lib/profile/types";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

type ProfileAvatarSectionProps = {
  userId: string;
  currentAvatarUrl: string | null;
  fullName: string | null;
  email: string | null;
};

export function ProfileAvatarSection({
  userId,
  currentAvatarUrl,
  fullName,
  email,
}: ProfileAvatarSectionProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [displayUrl, setDisplayUrl] = useState(currentAvatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const initials = getInitials(fullName, email);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_BYTES) {
      setError("Photo must be under 5 MB.");
      event.target.value = "";
      return;
    }

    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => setDisplayUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    void uploadFile(file);
  }

  async function uploadFile(file: File) {
    setPending(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadErr) {
        setError("Upload failed: " + uploadErr.message);
        setDisplayUrl(currentAvatarUrl);
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${urlData.publicUrl}?t=${Date.now()}`;

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "avatar", avatarUrl: urlData.publicUrl }),
      });

      const data = (await response.json()) as UpdateProfileSuccessResponse | AuthApiError;

      if (!response.ok || !("ok" in data)) {
        setError("error" in data ? data.error.message : "Could not save photo.");
        setDisplayUrl(currentAvatarUrl);
        return;
      }

      setDisplayUrl(url);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setDisplayUrl(currentAvatarUrl);
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removePhoto() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "avatar", avatarUrl: null }),
      });

      const data = (await response.json()) as UpdateProfileSuccessResponse | AuthApiError;

      if (!response.ok || !("ok" in data)) {
        setError("error" in data ? data.error.message : "Could not remove photo.");
        return;
      }

      setDisplayUrl(null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
    {/* <ProfileSection title="Profile photo"> */}
      <div className="flex flex-col items-center gap-4 py-2">
        {/* Avatar circle */}
        <div className="relative shrink-0">
          <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-2 border-card-border bg-bio-mint/40">
            {displayUrl ? (
              <img
                src={displayUrl}
                alt={fullName ?? "Profile photo"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl font-semibold text-bio-green">{initials}</span>
            )}
          </div>

          {pending ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="flex items-center gap-2 rounded-md border border-card-border bg-bio-white px-2 py-1 text-sm text-bio-text-muted hover:border-bio-green/50 hover:text-bio-green disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            {displayUrl ? "Replace photo" : "Upload photo"}
          </button>

          {displayUrl ? (
            <button
              type="button"
              onClick={() => void removePhoto()}
              disabled={pending}
              className="flex items-center gap-2 rounded-md border border-card-border bg-bio-white px-2 py-1 text-sm text-red-500 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Remove photo
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    {/* </ProfileSection> */}
    </div>
  );
}
