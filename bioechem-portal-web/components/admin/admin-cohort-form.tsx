"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
} | null;

type SchoolOption = { id: string; name: string };

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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
