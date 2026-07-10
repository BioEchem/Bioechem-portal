"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Handshake, Loader2, Trash2 } from "lucide-react";
import { PortalCard, PortalPage } from "@/components/portal/portal-page";

type ProgramRow = {
  id: string;
  title: string;
  description: string | null;
  status: "active" | "upcoming" | "completed";
  published: boolean;
};

const STATUSES = [
  { value: "active",    label: "Active" },
  { value: "upcoming",  label: "Upcoming" },
  { value: "completed", label: "Completed" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-bio-green/10 text-bio-green",
  upcoming: "bg-blue-50 text-blue-700",
  completed: "bg-gray-100 text-gray-600",
};

function ProgramForm({
  initial,
  onSave,
  onCancel,
  onDelete,
  mode,
}: {
  initial?: Partial<ProgramRow>;
  onSave: (data: Partial<ProgramRow>) => Promise<ProgramRow>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  mode: "create" | "edit";
}) {
  const [title,          setTitle]          = useState(initial?.title       ?? "");
  const [description,    setDescription]    = useState(initial?.description ?? "");
  const [programStatus,  setProgramStatus]  = useState<ProgramRow["status"]>(initial?.status ?? "active");
  const [published,      setPublished]      = useState(initial?.published   ?? true);
  const [saveStatus,     setSaveStatus]     = useState<string | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [confirming,     setConfirming]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaveStatus(mode === "create" ? "Creating…" : "Saving…");
    try {
      await onSave({ title, description: description || null, status: programStatus, published });
      setSaveStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setSaveStatus(null);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setSaveStatus("Deleting…");
    try { await onDelete(); } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setSaveStatus(null); setConfirming(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Title *</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
            placeholder="Mentorship Program" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Description</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none"
            placeholder="Brief description of this program…" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-bio-text-muted">Status</label>
          <select value={programStatus} onChange={(e) => setProgramStatus(e.target.value as ProgramRow["status"])}
            className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm focus:border-bio-green focus:outline-none">
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 rounded border-card-border accent-bio-green" />
        <span className="text-bio-text">Published (visible to industry partners)</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={!!saveStatus}
          className="flex items-center gap-2 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60">
          {saveStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {saveStatus ?? (mode === "create" ? "Create" : "Save changes")}
        </button>
        <button type="button" onClick={onCancel} disabled={!!saveStatus}
          className="rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text disabled:opacity-60">
          Cancel
        </button>
        {onDelete && mode === "edit" && (
          confirming ? (
            <span className="ml-auto flex items-center gap-2">
              <span className="text-xs text-red-600">Delete this program?</span>
              <button type="button" onClick={() => void handleDelete()} disabled={!!saveStatus}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60">
                {saveStatus === "Deleting…" ? "Deleting…" : "Yes, delete"}
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

export default function AdminPartnerProgramsPage() {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/partner-programs");
    const json = await res.json() as { data?: ProgramRow[] };
    setPrograms(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(data: Partial<ProgramRow>): Promise<ProgramRow> {
    const res = await fetch("/api/admin/partner-programs", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const json = await res.json() as { data?: ProgramRow; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Failed to create");
    setPrograms((prev) => [json.data!, ...prev]);
    setCreating(false);
    return json.data!;
  }

  async function handleUpdate(id: string, data: Partial<ProgramRow>): Promise<ProgramRow> {
    const res = await fetch(`/api/admin/partner-programs/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    const json = await res.json() as { data?: ProgramRow; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Failed to update");
    setPrograms((prev) => prev.map((p) => (p.id === id ? { ...p, ...json.data } : p)));
    setExpandedId(null);
    return json.data!;
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/partner-programs/${id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? "Delete failed"); }
    setPrograms((prev) => prev.filter((p) => p.id !== id));
  }

  async function togglePublish(program: ProgramRow) {
    const res = await fetch(`/api/admin/partner-programs/${program.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !program.published }),
    });
    const json = await res.json() as { data?: ProgramRow };
    if (json.data) setPrograms((prev) => prev.map((p) => (p.id === program.id ? { ...p, published: json.data!.published } : p)));
  }

  return (
    <PortalPage title="Partner Programs" description="Manage active BioEChem partnership programs shown to industry partners.">
      <div className="space-y-4">
        <div className="flex justify-end">
          {!creating && (
            <button onClick={() => setCreating(true)}
              className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90">
              + Add program
            </button>
          )}
        </div>

        {creating && (
          <PortalCard>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-bio-green">New program</h2>
            <ProgramForm mode="create" onSave={handleCreate} onCancel={() => setCreating(false)} />
          </PortalCard>
        )}

        {loading && <p className="text-sm text-bio-text-muted">Loading…</p>}

        {!loading && programs.length === 0 && !creating && (
          <PortalCard>
            <div className="flex flex-col items-center py-10 text-center">
              <Handshake className="mb-3 h-8 w-8 text-bio-text-muted" />
              <p className="text-sm text-bio-text-muted">No programs yet. Click <strong>+ Add program</strong> to create one.</p>
            </div>
          </PortalCard>
        )}

        {programs.map((program) => (
          <PortalCard key={program.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-bio-text">{program.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[program.status]}`}>
                    {program.status}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${program.published ? "bg-bio-green/10 text-bio-green" : "bg-amber-100 text-amber-700"}`}>
                    {program.published ? "Published" : "Draft"}
                  </span>
                </div>
                {program.description ? (
                  <p className="mt-0.5 text-xs text-bio-text-muted">{program.description}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button onClick={() => void togglePublish(program)}
                  className={`text-xs font-medium ${program.published ? "text-amber-600 hover:text-amber-700" : "text-bio-green hover:text-bio-green/80"}`}>
                  {program.published ? "Unpublish" : "Publish"}
                </button>
                <button onClick={() => setExpandedId(expandedId === program.id ? null : program.id)}
                  className="text-bio-text-muted hover:text-bio-green">
                  {expandedId === program.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {expandedId === program.id && (
              <div className="mt-4 border-t border-card-border pt-4">
                <ProgramForm
                  mode="edit"
                  initial={program}
                  onSave={(data) => handleUpdate(program.id, data)}
                  onCancel={() => setExpandedId(null)}
                  onDelete={() => handleDelete(program.id)}
                />
              </div>
            )}
          </PortalCard>
        ))}
      </div>
    </PortalPage>
  );
}
