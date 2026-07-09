"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { authInputClassName, authLabelClassName } from "@/components/auth/form-styles";

type Cohort = {
  id: string;
  name: string;
  description: string | null;
  school_id: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  max_enrollment: number | null;
  enrollment_requires_approval: boolean;
  cohort_contacts?: { id: string; name: string; email: string; title: string | null; position: number }[];
} | null;

type SchoolOption = { id: string; name: string };
type Contact = { name: string; email: string; title: string };

type Props = {
  cohort: Cohort;
  schools: SchoolOption[];
  isBioAdmin: boolean;
  presetSchoolId?: string;
};

export function AdminCohortForm({ cohort, schools, isBioAdmin, presetSchoolId }: Props) {
  const router = useRouter();
  const isNew = !cohort;

  const [name, setName] = useState(cohort?.name ?? "");
  const [description, setDescription] = useState(cohort?.description ?? "");
  const [schoolId, setSchoolId] = useState(cohort?.school_id ?? presetSchoolId ?? "");
  const [status, setStatus] = useState<"draft" | "active" | "archived">(
    (cohort?.status as "draft" | "active" | "archived") ?? "active",
  );
  const [startDate, setStartDate] = useState(cohort?.start_date ?? "");
  const [endDate, setEndDate] = useState(cohort?.end_date ?? "");
  const [maxEnrollment, setMaxEnrollment] = useState(
    cohort?.max_enrollment != null ? String(cohort.max_enrollment) : "",
  );
  const [requiresApproval, setRequiresApproval] = useState(
    cohort?.enrollment_requires_approval ?? false,
  );
  const [contacts, setContacts] = useState<Contact[]>(
    (cohort?.cohort_contacts ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ name: c.name, email: c.email, title: c.title ?? "" }))
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addContact() {
    setContacts((prev) => [...prev, { name: "", email: "", title: "" }]);
  }

  function removeContact(i: number) {
    setContacts((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateContact(i: number, field: keyof Contact, value: string) {
    setContacts((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setError(null);
    setPending(true);

    const maxEnrollmentNum = maxEnrollment.trim()
      ? Number.parseInt(maxEnrollment, 10)
      : null;

    try {
      const url = isNew ? "/api/admin/cohorts" : `/api/admin/cohorts/${cohort!.id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          schoolId: schoolId || null,
          status,
          startDate: startDate || null,
          endDate: endDate || null,
          maxEnrollment: maxEnrollmentNum,
          enrollmentRequiresApproval: requiresApproval,
          contacts: contacts.filter((c) => c.name.trim() && c.email.trim()),
        }),
      });
      const json = await res.json() as { data?: { id: string }; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to save."); return; }
      // After save: go to the cohort overview for edits, list for new
      router.push(isNew ? "/admin/cohorts" : `/admin/cohorts/${json.data!.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={authLabelClassName}>Cohort name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            placeholder="e.g. Fall 2026 — Bio Battery"
            className={authInputClassName}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={authLabelClassName}>
            Description <span className="font-normal text-bio-text-muted">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
            rows={2}
            className="mt-1 w-full resize-y rounded-lg border border-card-border bg-bio-white px-3 py-2.5 text-sm text-bio-text focus:border-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/25"
          />
        </div>

        {isBioAdmin ? (
          <div className="sm:col-span-2">
            <label className={authLabelClassName}>
              School <span className="font-normal text-bio-text-muted">(leave blank for standalone)</span>
            </label>
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              disabled={pending}
              className={authInputClassName}
            >
              <option value="">— Standalone cohort —</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label className={authLabelClassName}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "active" | "archived")}
            disabled={pending}
            className={authInputClassName}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <label className={authLabelClassName}>
            Max enrollment <span className="font-normal text-bio-text-muted">(leave blank for unlimited)</span>
          </label>
          <input
            type="number"
            min={1}
            value={maxEnrollment}
            onChange={(e) => setMaxEnrollment(e.target.value)}
            disabled={pending}
            placeholder="Unlimited"
            className={authInputClassName}
          />
        </div>

        <div>
          <label className={authLabelClassName}>Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={pending}
            className={authInputClassName}
          />
        </div>

        <div>
          <label className={authLabelClassName}>End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={pending}
            className={authInputClassName}
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-bio-text">
        <input
          type="checkbox"
          checked={requiresApproval}
          onChange={(e) => setRequiresApproval(e.target.checked)}
          disabled={pending}
          className="h-4 w-4 accent-bio-green"
        />
        Require approval for enrollment requests
      </label>

      {/* Contacts */}
      <div className="space-y-3 border-t border-card-border pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-bio-text">Cohort contacts</p>
            <p className="text-xs text-bio-text-muted">Project or cohort managers participants can reach out to</p>
          </div>
          <button
            type="button"
            onClick={addContact}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-bio-green hover:bg-bio-surface disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add contact
          </button>
        </div>

        {contacts.length === 0 ? (
          <p className="text-xs text-bio-text-muted italic">No contacts added yet.</p>
        ) : (
          <div className="space-y-3">
            {contacts.map((c, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-card-border bg-bio-surface p-3 sm:grid-cols-3">
                <div>
                  <label className={authLabelClassName}>Name *</label>
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => updateContact(i, "name", e.target.value)}
                    disabled={pending}
                    placeholder="Jane Smith"
                    className={authInputClassName}
                  />
                </div>
                <div>
                  <label className={authLabelClassName}>Email *</label>
                  <input
                    type="email"
                    value={c.email}
                    onChange={(e) => updateContact(i, "email", e.target.value)}
                    disabled={pending}
                    placeholder="jane@example.com"
                    className={authInputClassName}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={authLabelClassName}>Title <span className="font-normal text-bio-text-muted">(optional)</span></label>
                    <input
                      type="text"
                      value={c.title}
                      onChange={(e) => updateContact(i, "title", e.target.value)}
                      disabled={pending}
                      placeholder="Project Manager"
                      className={authInputClassName}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeContact(i)}
                    disabled={pending}
                    className="mt-6 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
                    aria-label="Remove contact"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      ) : null}

      <div className="flex gap-3 border-t border-card-border pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-50"
        >
          {pending ? "Saving…" : isNew ? "Create cohort" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={pending}
          className="rounded-lg border border-card-border px-4 py-2 text-sm text-bio-text-muted hover:text-bio-text disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
