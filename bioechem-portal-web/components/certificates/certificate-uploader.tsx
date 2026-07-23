"use client";

import { useState, useRef } from "react";
import { Upload, X, ExternalLink, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getShortInitials as getInitials } from "@/lib/profile/display";
import { formatShortDate } from "@/lib/format/date";

type Student = {
  user_id: string;
  name: string | null;
  email: string | null;
};

type CertificateRow = {
  id: string;
  title: string;
  file_url: string;
  filename: string | null;
  uploaded_at: string;
  user_id: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

type Props = {
  cohortId: string;
  students: Student[];
  initialCerts: CertificateRow[];
};

// Upload form for a single student — shown inline when admin clicks "Upload"
function StudentCertUploadForm({
  student,
  cohortId,
  onUploaded,
  onCancel,
}: {
  student: Student;
  cohortId: string;
  onUploaded: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const inputCls =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-bio-green/50 focus:border-bio-green";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "pdf";
    const path = `${cohortId}/${student.user_id}/${Date.now()}.${ext}`;

    const { data: storageData, error: storageErr } = await supabase.storage
      .from("certificates")
      .upload(path, file, { upsert: false });

    if (storageErr) {
      setError(storageErr.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("certificates")
      .getPublicUrl(storageData.path);

    const res = await fetch(`/api/admin/cohorts/${cohortId}/certificates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: student.user_id,
        title: title.trim(),
        file_url: publicUrl,
        filename: file.name,
      }),
    });

    const json = await res.json() as { error?: string };
    setUploading(false);

    if (!res.ok) {
      setError(json.error ?? "Failed to save.");
      return;
    }

    onUploaded();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-lg border border-bio-green/30 bg-bio-mint/20 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-bio-green uppercase tracking-wide">
          Upload certificate for {student.name ?? student.email}
        </p>
        <button type="button" onClick={onCancel} className="text-bio-text-muted hover:text-bio-text">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <div>
        <label className="block text-xs font-medium text-bio-text-muted mb-1">Certificate title *</label>
        <input
          className={inputCls}
          placeholder="e.g. Program Completion Certificate"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <p className="mt-1 text-[11px] text-bio-text-muted">
          This is the label shown to the student (not the filename). Make it descriptive, e.g. "Fall 2026 Completion Certificate".
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-bio-text-muted mb-1">
          Certificate file * <span className="font-normal">(PDF, PNG, JPG — max 20 MB)</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 file:mr-3 file:rounded file:border-0 file:bg-bio-green/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/50"
        />
        {file && (
          <p className="mt-1 text-[11px] text-bio-text-muted">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={uploading || !file || !title.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-bio-text-muted hover:bg-bio-mint/30"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function CertificateUploader({ cohortId, students, initialCerts }: Props) {
  const [certs, setCerts] = useState<CertificateRow[]>(initialCerts);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null); // user_id
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refreshCerts() {
    const res = await fetch(`/api/admin/cohorts/${cohortId}/certificates`);
    const json = await res.json() as { data: CertificateRow[] };
    setCerts(json.data ?? []);
  }

  async function handleDelete(certId: string) {
    if (!confirm("Delete this certificate? This cannot be undone.")) return;
    setDeletingId(certId);
    await fetch(`/api/admin/certificates/${certId}`, { method: "DELETE" });
    setCerts((prev) => prev.filter((c) => c.id !== certId));
    setDeletingId(null);
  }

  // Index certs by user_id for quick lookup
  const certsByUser = new Map<string, CertificateRow[]>();
  for (const cert of certs) {
    const existing = certsByUser.get(cert.user_id) ?? [];
    existing.push(cert);
    certsByUser.set(cert.user_id, existing);
  }

  if (students.length === 0) {
    return (
      <p className="text-sm text-bio-text-muted">
        No approved students enrolled yet. Certificates can be issued once students are enrolled.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-bio-text-muted">
        Upload a personalised certificate file for each student. Each certificate is stored separately and only visible to that student.
      </p>

      {students.map((student) => {
        const studentCerts = certsByUser.get(student.user_id) ?? [];
        const isUploading = uploadingFor === student.user_id;
        const displayName = student.name ?? student.email ?? student.user_id;

        return (
          <div
            key={student.user_id}
            className="rounded-xl border border-card-border bg-white p-4"
          >
            {/* Student row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bio-green/10 text-xs font-semibold text-bio-green">
                  {getInitials(student.name, student.email)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-bio-text truncate">{displayName}</p>
                  {student.name && student.email && (
                    <p className="text-xs text-bio-text-muted truncate">{student.email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {studentCerts.length > 0 && (
                  <span className="rounded-full bg-bio-green/10 px-2 py-0.5 text-xs font-medium text-bio-green">
                    {studentCerts.length} cert{studentCerts.length > 1 ? "s" : ""}
                  </span>
                )}
                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => setUploadingFor(student.user_id)}
                    className="flex items-center gap-1.5 rounded-lg border border-bio-green px-3 py-1.5 text-xs font-medium text-bio-green hover:bg-bio-green/10"
                  >
                    <Upload className="h-3 w-3" />
                    Upload certificate
                  </button>
                )}
              </div>
            </div>

            {/* Existing certs for this student */}
            {studentCerts.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-card-border pt-3">
                {studentCerts.map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between gap-3 rounded-lg bg-bio-mint/20 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">📄</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-bio-text truncate">{cert.title}</p>
                        <p className="text-[11px] text-bio-text-muted">
                          {cert.filename ?? "certificate"} · Uploaded {formatShortDate(cert.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={cert.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-bio-green hover:bg-bio-green/10"
                        title="View"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(cert.id)}
                        disabled={deletingId === cert.id}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                        {deletingId === cert.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inline upload form */}
            {isUploading && (
              <StudentCertUploadForm
                student={student}
                cohortId={cohortId}
                onUploaded={async () => {
                  setUploadingFor(null);
                  await refreshCerts();
                }}
                onCancel={() => setUploadingFor(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
