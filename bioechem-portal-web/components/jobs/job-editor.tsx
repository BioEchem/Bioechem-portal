"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

export type JobRow = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  type: string;
  description: string;
  requirements: string | null;
  deadline: string | null;
  visible_to: string[];
  published: boolean;
  created_at: string;
};

const TYPE_OPTIONS = [
  { value: "full-time",  label: "Full-time" },
  { value: "part-time",  label: "Part-time" },
  { value: "internship", label: "Internship" },
  { value: "contract",   label: "Contract" },
];

const ROLE_OPTIONS = [
  { value: "participant",      label: "Participants" },
  { value: "teacher",          label: "Teachers" },
  { value: "school_admin",     label: "School admins" },
  { value: "industry_partner", label: "Industry partners" },
  { value: "shareholder",      label: "Shareholders" },
];

type Props = {
  mode: "create" | "edit";
  initial?: Partial<JobRow>;
  onSave: (data: Partial<JobRow>) => Promise<JobRow>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
};

export function JobEditor({ mode, initial = {}, onSave, onCancel, onDelete }: Props) {
  const [title,        setTitle]        = useState(initial.title        ?? "");
  const [company,      setCompany]      = useState(initial.company      ?? "");
  const [location,     setLocation]     = useState(initial.location     ?? "");
  const [type,         setType]         = useState(initial.type         ?? "internship");
  const [description,  setDescription]  = useState(initial.description  ?? "");
  const [requirements, setRequirements] = useState(initial.requirements ?? "");
  const [deadline,     setDeadline]     = useState(initial.deadline     ?? "");
  const [visibleTo,    setVisibleTo]    = useState<string[]>(initial.visible_to ?? []);
  const [published,    setPublished]    = useState(initial.published    ?? false);
  const [status,       setStatus]       = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [confirming,   setConfirming]   = useState(false);

  function toggleRole(role: string) {
    setVisibleTo((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(mode === "create" ? "Creating…" : "Saving…");
    try {
      await onSave({
        title, company,
        location:     location.trim()     || null,
        type,
        description,
        requirements: requirements.trim() || null,
        deadline:     deadline            || null,
        visible_to:   visibleTo,
        published,
      });
      setStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setStatus(null);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setStatus("Deleting…");
    try { await onDelete(); } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setStatus(null);
      setConfirming(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Job title *</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
            placeholder="Research Intern" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Company *</label>
          <input required value={company} onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
            placeholder="BioEChem Labs" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
            placeholder="Remote / New York, NY" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Type *</label>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none">
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Application deadline</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
            className="rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">Description *</label>
        <textarea required rows={5} value={description} onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
          placeholder="Describe the role, responsibilities, and what candidates can expect…" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-bio-text-muted">Requirements</label>
        <textarea rows={3} value={requirements} onChange={(e) => setRequirements(e.target.value)}
          className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-bio-text focus:border-bio-green focus:outline-none"
          placeholder="Skills, qualifications, or experience required…" />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-bio-text-muted">
          Visible to <span className="font-normal">(leave all unchecked to show all roles)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-card-border px-3 py-1 text-xs transition-colors hover:border-bio-green has-[:checked]:border-bio-green has-[:checked]:bg-bio-green/10 has-[:checked]:text-bio-green">
              <input type="checkbox" className="sr-only"
                checked={visibleTo.includes(opt.value)}
                onChange={() => toggleRole(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 rounded border-card-border accent-bio-green" />
        <span className="text-bio-text">Published (visible to portal users)</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={!!status}
          className="flex items-center gap-2 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60">
          {status ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {status ?? (mode === "create" ? "Create posting" : "Save changes")}
        </button>
        <button type="button" onClick={onCancel} disabled={!!status}
          className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-bio-text-muted hover:text-bio-text disabled:opacity-60">
          Cancel
        </button>
        {onDelete && mode === "edit" && (
          confirming ? (
            <span className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-red-600">Delete this posting?</span>
              <button type="button" onClick={() => void handleDelete()} disabled={!!status}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60">
                {status === "Deleting…" ? "Deleting…" : "Yes, delete"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="text-xs text-bio-text-muted hover:underline">Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirming(true)}
              className="ml-auto flex items-center gap-1 text-xs text-bio-text-muted hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )
        )}
      </div>
    </form>
  );
}
