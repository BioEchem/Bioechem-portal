"use client";

import { FileText, Paperclip, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ProfileSection } from "@/components/profile/profile-section";
import { createClient } from "@/lib/supabase/client";

const MAX_RESUME_BYTES = 10 * 1024 * 1024;

type ResumeRecord = {
  id: string;
  url: string;
  filename: string | null;
  uploaded_at: string;
};

type ProfileResumeSectionProps = {
  userId: string;
  currentResumeUrl: string | null;
  resumeHistory: ResumeRecord[];
};

export function ProfileResumeSection({
  userId,
  currentResumeUrl,
  resumeHistory,
}: ProfileResumeSectionProps) {
  const router = useRouter();
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_RESUME_BYTES) {
      setError("Resume must be under 10 MB.");
      event.target.value = "";
      return;
    }
    setError(null);
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setError(null);
    setPending(true);

    try {
      const supabase = createClient();
      const ext = selectedFile.name.split(".").pop() ?? "pdf";
      const path = `${userId}/${Date.now()}_resume.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("resumes")
        .upload(path, selectedFile);

      if (uploadErr) {
        setError("Upload failed: " + uploadErr.message);
        return;
      }

      const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(path);
      const url = urlData.publicUrl;

      const response = await fetch("/api/profile/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, filename: selectedFile.name }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError("error" in data ? data.error.message : "Could not save resume.");
        return;
      }

      setSelectedFile(null);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function cancelSelection() {
    setSelectedFile(null);
    setError(null);
    if (resumeInputRef.current) resumeInputRef.current.value = "";
  }

  const hasResume = Boolean(currentResumeUrl);

  return (
    <ProfileSection
      title="Resume"
      description="Your current resume. Previous versions are kept for reference."
    >
      {/* Current resume */}
      {hasResume && !selectedFile ? (
        <div className="flex items-center gap-2 rounded-lg border border-card-border bg-bio-mint/20 px-4 py-3 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-bio-green" />
          <span className="flex-1 text-bio-text">Current resume</span>
          <a
            href={currentResumeUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-bio-green hover:underline"
          >
            View
          </a>
        </div>
      ) : null}

      {/* Selected file preview */}
      {selectedFile ? (
        <div className="flex items-center gap-2 rounded-lg border border-bio-green/30 bg-bio-mint/30 px-4 py-3 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-bio-green" />
          <span className="flex-1 truncate text-bio-text">{selectedFile.name}</span>
          <button
            type="button"
            onClick={cancelSelection}
            className="text-bio-text-muted hover:text-bio-text"
            aria-label="Cancel selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Error */}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {selectedFile ? (
          <button
            type="button"
            onClick={handleUpload}
            disabled={pending}
            className="bio-btn-primary"
          >
            {pending ? "Uploading…" : "Save resume"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => resumeInputRef.current?.click()}
            disabled={pending}
            className="flex items-center gap-2 rounded-lg border border-dashed border-card-border bg-bio-white px-4 py-2.5 text-sm text-bio-text-muted hover:border-bio-green/50 hover:text-bio-green disabled:opacity-50"
          >
            <Paperclip className="h-4 w-4" />
            {hasResume ? "Replace resume" : "Upload resume"}
          </button>
        )}

        {resumeHistory.length > 1 ? (
          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            className="text-sm text-bio-text-muted hover:text-bio-text"
          >
            {showHistory ? "Hide history" : `View history (${resumeHistory.length} versions)`}
          </button>
        ) : null}
      </div>

      <input
        ref={resumeInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Resume history */}
      {showHistory && resumeHistory.length > 0 ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-bio-text-muted">
            Upload history
          </p>
          {resumeHistory.map((record) => (
            <div
              key={record.id}
              className="flex items-center gap-2 rounded-lg border border-card-border px-4 py-2.5 text-sm"
            >
              <FileText className="h-4 w-4 shrink-0 text-bio-text-muted" />
              <span className="flex-1 truncate text-bio-text-muted">
                {record.filename ?? "Resume"}{" "}
                <span className="text-xs">
                  — {new Date(record.uploaded_at).toLocaleDateString()}
                </span>
              </span>
              <a
                href={record.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-bio-green hover:underline"
              >
                View
              </a>
            </div>
          ))}
        </div>
      ) : null}
    </ProfileSection>
  );
}
