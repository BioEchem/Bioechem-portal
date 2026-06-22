"use client";

import { Briefcase, GraduationCap, Heart, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  authInputClassName,
  authLabelClassName,
} from "@/components/auth/form-styles";
import { ProfileEditPanel } from "@/components/profile/profile-edit-panel";
import { ProfileFormFeedback } from "@/components/profile/profile-form-feedback";
import { ProfileSection } from "@/components/profile/profile-section";
import type { AuthApiError } from "@/lib/auth/types";
import { DEGREE_OPTIONS, emptyEducationEntry } from "@/lib/profile/education";
import type {
  EducationEntry,
  UpdateProfileSuccessResponse,
  WorkEntry,
} from "@/lib/profile/types";
import { emptyWorkEntry, MONTH_OPTIONS, WORK_TYPE_OPTIONS } from "@/lib/profile/work";

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: "", label: "Year" },
  ...Array.from({ length: currentYear - 1939 + 5 }, (_, i) => {
    const y = String(currentYear + 4 - i);
    return { value: y, label: y };
  }),
];

function degreeLabel(v: string | null | undefined) {
  return DEGREE_OPTIONS.find((o) => o.value === v)?.label ?? v ?? null;
}

function workTypeLabel(v: string | null | undefined) {
  return WORK_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? null;
}

// ── small shared sub-components ──────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  onAdd,
}: {
  icon: React.ReactNode;
  label: string;
  onAdd: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide text-bio-green">{label}</p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1 text-sm font-medium text-bio-green hover:text-bio-green/80"
      >
        <Plus className="h-4 w-4" />
        Add
      </button>
    </div>
  );
}

function EntryCard({
  accentColor,
  title,
  isCurrent,
  onEdit,
  onDelete,
  pending,
  children,
}: {
  accentColor: string;
  title: string;
  isCurrent: boolean;
  onEdit: () => void;
  onDelete: () => void;
  pending: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-card-border bg-card">
      <div className="flex">
        <div className={`w-1 shrink-0 ${accentColor}`} />
        <div className="min-w-0 flex-1 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <p className="text-sm font-semibold text-bio-text">{title}</p>
              {isCurrent ? (
                <span className="rounded-full bg-bio-green/10 px-2 py-0.5 text-xs font-medium text-bio-green">
                  Current
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onEdit}
                disabled={pending}
                aria-label="Edit"
                className="text-bio-text-muted hover:text-bio-green disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                aria-label="Delete"
                className="text-bio-text-muted hover:text-red-500 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function LabeledField({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: string | null | undefined;
  fullWidth?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={fullWidth ? "col-span-full" : undefined}>
      <dt className="text-xs text-bio-text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-bio-text">{value}</dd>
    </div>
  );
}

const opt = <span className="font-normal text-bio-text-muted">(optional)</span>;

// ── form sub-components ───────────────────────────────────────────────────────

function EducationForm({
  draft,
  onChange,
  pending,
}: {
  draft: EducationEntry;
  onChange: (d: EducationEntry) => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="edu-inst" className={authLabelClassName}>
          School / Institution *
        </label>
        <input
          id="edu-inst"
          type="text"
          disabled={pending}
          value={draft.institution}
          onChange={(e) => onChange({ ...draft, institution: e.target.value })}
          className={authInputClassName}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="edu-degree" className={authLabelClassName}>
            Degree {opt}
          </label>
          <select
            id="edu-degree"
            disabled={pending}
            value={draft.degree ?? ""}
            onChange={(e) => onChange({ ...draft, degree: e.target.value || null })}
            className={authInputClassName}
          >
            {DEGREE_OPTIONS.map((o) => (
              <option key={o.value || "none"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="edu-field" className={authLabelClassName}>
            Field of study {opt}
          </label>
          <input
            id="edu-field"
            type="text"
            disabled={pending}
            value={draft.fieldOfStudy ?? ""}
            onChange={(e) => onChange({ ...draft, fieldOfStudy: e.target.value || null })}
            className={authInputClassName}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="edu-start" className={authLabelClassName}>
            Start year {opt}
          </label>
          <select
            id="edu-start"
            disabled={pending}
            value={draft.startYear ?? ""}
            onChange={(e) => onChange({ ...draft, startYear: e.target.value || null })}
            className={authInputClassName}
          >
            {YEAR_OPTIONS.map((o) => (
              <option key={o.value || "none"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="edu-end" className={authLabelClassName}>
            End year {opt}
          </label>
          <select
            id="edu-end"
            disabled={pending || draft.isCurrent}
            value={draft.isCurrent ? "" : (draft.endYear ?? "")}
            onChange={(e) => onChange({ ...draft, endYear: e.target.value || null })}
            className={authInputClassName}
          >
            {YEAR_OPTIONS.map((o) => (
              <option key={o.value || "none"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-bio-text">
        <input
          type="checkbox"
          checked={draft.isCurrent}
          disabled={pending}
          onChange={(e) =>
            onChange({
              ...draft,
              isCurrent: e.target.checked,
              ...(e.target.checked ? { endYear: null } : {}),
            })
          }
          className="h-4 w-4 accent-bio-green"
        />
        I currently attend here
      </label>
    </div>
  );
}

function WorkForm({
  draft,
  onChange,
  pending,
  showType,
}: {
  draft: WorkEntry;
  onChange: (d: WorkEntry) => void;
  pending: boolean;
  showType: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={showType ? undefined : "sm:col-span-2"}>
          <label htmlFor="work-co" className={authLabelClassName}>
            Company / Organization *
          </label>
          <input
            id="work-co"
            type="text"
            disabled={pending}
            value={draft.company}
            onChange={(e) => onChange({ ...draft, company: e.target.value })}
            className={authInputClassName}
          />
        </div>
        {showType ? (
          <div>
            <label htmlFor="work-type" className={authLabelClassName}>
              Type {opt}
            </label>
            <select
              id="work-type"
              disabled={pending}
              value={draft.type ?? ""}
              onChange={(e) => onChange({ ...draft, type: e.target.value || null })}
              className={authInputClassName}
            >
              <option value="">Select type</option>
              {WORK_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div>
        <label htmlFor="work-title" className={authLabelClassName}>
          Job title / Role {opt}
        </label>
        <input
          id="work-title"
          type="text"
          disabled={pending}
          value={draft.title ?? ""}
          onChange={(e) => onChange({ ...draft, title: e.target.value || null })}
          className={authInputClassName}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={authLabelClassName}>Start date {opt}</label>
          <div className="flex gap-2">
            <select
              disabled={pending}
              value={draft.startMonth ?? ""}
              onChange={(e) => onChange({ ...draft, startMonth: e.target.value || null })}
              className={authInputClassName}
              aria-label="Start month"
            >
              {MONTH_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              disabled={pending}
              value={draft.startYear ?? ""}
              onChange={(e) => onChange({ ...draft, startYear: e.target.value || null })}
              className={authInputClassName}
              aria-label="Start year"
            >
              {YEAR_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={authLabelClassName}>End date {opt}</label>
          <div className="flex gap-2">
            <select
              disabled={pending || draft.isCurrent}
              value={draft.isCurrent ? "" : (draft.endMonth ?? "")}
              onChange={(e) => onChange({ ...draft, endMonth: e.target.value || null })}
              className={authInputClassName}
              aria-label="End month"
            >
              {MONTH_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              disabled={pending || draft.isCurrent}
              value={draft.isCurrent ? "" : (draft.endYear ?? "")}
              onChange={(e) => onChange({ ...draft, endYear: e.target.value || null })}
              className={authInputClassName}
              aria-label="End year"
            >
              {YEAR_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-bio-text">
        <input
          type="checkbox"
          checked={draft.isCurrent}
          disabled={pending}
          onChange={(e) =>
            onChange({
              ...draft,
              isCurrent: e.target.checked,
              ...(e.target.checked ? { endMonth: null, endYear: null } : {}),
            })
          }
          className="h-4 w-4 accent-bio-green"
        />
        I currently work / volunteer here
      </label>

      <div>
        <label htmlFor="work-desc" className={authLabelClassName}>
          Description {opt}
        </label>
        <textarea
          id="work-desc"
          disabled={pending}
          value={draft.description ?? ""}
          onChange={(e) => onChange({ ...draft, description: e.target.value || null })}
          placeholder="Brief description of your role…"
          className="mt-1 w-full resize-y rounded-lg border border-card-border bg-bio-white px-3 py-2.5 text-sm text-bio-text placeholder:text-bio-text-muted/70 focus:border-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/25"
          style={{ minHeight: "72px" }}
        />
      </div>
    </div>
  );
}

// ── modal state type ──────────────────────────────────────────────────────────

type ModalState =
  | null
  | { kind: "education"; index: number }  // -1 = add
  | { kind: "work"; index: number }       // -1 = add; index into workHistory[]
  | { kind: "volunteer"; index: number }; // -1 = add; index into workHistory[]

// ── main component ────────────────────────────────────────────────────────────

type ProfileBackgroundSectionProps = {
  initialEducation: EducationEntry[];
  initialWorkHistory: WorkEntry[];
};

export function ProfileBackgroundSection({
  initialEducation,
  initialWorkHistory,
}: ProfileBackgroundSectionProps) {
  const router = useRouter();

  const [education, setEducation] = useState(initialEducation);
  const [workHistory, setWorkHistory] = useState(initialWorkHistory);

  const [modal, setModal] = useState<ModalState>(null);
  const [eduDraft, setEduDraft] = useState<EducationEntry>(emptyEducationEntry());
  const [workDraft, setWorkDraft] = useState<WorkEntry>(emptyWorkEntry());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jobEntries = workHistory
    .map((e, i) => ({ entry: e, idx: i }))
    .filter(({ entry }) => entry.type !== "volunteer");
  const volunteerEntries = workHistory
    .map((e, i) => ({ entry: e, idx: i }))
    .filter(({ entry }) => entry.type === "volunteer");

  function openAdd(kind: "education" | "work" | "volunteer") {
    setError(null);
    if (kind === "education") {
      setEduDraft(emptyEducationEntry());
    } else {
      setWorkDraft({ ...emptyWorkEntry(), type: kind === "volunteer" ? "volunteer" : null });
    }
    setModal({ kind, index: -1 });
  }

  function openEdit(kind: "education" | "work" | "volunteer", idx: number) {
    setError(null);
    if (kind === "education") {
      setEduDraft({ ...education[idx] });
    } else {
      setWorkDraft({ ...workHistory[idx] });
    }
    setModal({ kind, index: idx });
  }

  function closeModal() {
    if (pending) return;
    setModal(null);
    setError(null);
  }

  async function patch(edu: EducationEntry[], work: WorkEntry[]): Promise<boolean> {
    setPending(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "background", education: edu, workHistory: work }),
      });
      const data = (await res.json()) as UpdateProfileSuccessResponse | AuthApiError;
      if (!res.ok || !("ok" in data)) {
        setError("error" in data ? data.error.message : "Could not save.");
        return false;
      }
      setEducation(edu);
      setWorkHistory(work);
      router.refresh();
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleEduSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!eduDraft.institution.trim()) {
      setError("Institution is required.");
      return;
    }
    const m = modal as { kind: "education"; index: number };
    const newEdu =
      m.index === -1
        ? [...education, eduDraft]
        : education.map((en, i) => (i === m.index ? eduDraft : en));
    const ok = await patch(newEdu, workHistory);
    if (ok) setModal(null);
  }

  async function handleWorkSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!workDraft.company.trim()) {
      setError("Company / Organization is required.");
      return;
    }
    const m = modal as { kind: "work" | "volunteer"; index: number };
    const draft: WorkEntry =
      m.kind === "volunteer" ? { ...workDraft, type: "volunteer" } : workDraft;
    const newWork =
      m.index === -1
        ? [...workHistory, draft]
        : workHistory.map((en, i) => (i === m.index ? draft : en));
    const ok = await patch(education, newWork);
    if (ok) setModal(null);
  }

  async function deleteEducation(index: number) {
    await patch(
      education.filter((_, i) => i !== index),
      workHistory,
    );
  }

  async function deleteWork(index: number) {
    await patch(
      education,
      workHistory.filter((_, i) => i !== index),
    );
  }

  const isEduModal = modal?.kind === "education";
  const isWorkModal = modal?.kind === "work";
  const isVolunteerModal = modal?.kind === "volunteer";
  const isAdding = modal?.index === -1;

  return (
    <>
      {/* <ProfileSection
        // title="Background"
        // description="Your education, work history, and volunteer experience."
      > */}
        <div className="space-y-8">
          {/* ── Education ── */}
          <div>
            <SectionHeader
              icon={<GraduationCap className="h-4 w-4 text-bio-green" />}
              label="Education"
              onAdd={() => openAdd("education")}
            />
            {education.length === 0 ? (
              <p className="text-sm text-bio-text-muted">No education added yet.</p>
            ) : (
              <div className="space-y-3">
                {education.map((entry, i) => (
                  <EntryCard
                    key={i}
                    accentColor="bg-bio-green"
                    title={entry.institution}
                    isCurrent={entry.isCurrent}
                    onEdit={() => openEdit("education", i)}
                    onDelete={() => deleteEducation(i)}
                    pending={pending}
                  >
                    <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-card-border pt-2">
                      <LabeledField label="Degree" value={degreeLabel(entry.degree)} />
                      <LabeledField label="Field of study" value={entry.fieldOfStudy} />
                      <LabeledField label="From" value={entry.startYear} />
                      <LabeledField label="To" value={entry.isCurrent ? "Present" : (entry.endYear ?? null)} />
                    </dl>
                  </EntryCard>
                ))}
              </div>
            )}
          </div>

          {/* ── Work history ── */}
          <div>
            <SectionHeader
              icon={<Briefcase className="h-4 w-4 text-bio-green" />}
              label="Work history"
              onAdd={() => openAdd("work")}
            />
            {jobEntries.length === 0 ? (
              <p className="text-sm text-bio-text-muted">No work history added yet.</p>
            ) : (
              <div className="space-y-3">
                {jobEntries.map(({ entry, idx }) => {
                  const fromDate = [entry.startMonth, entry.startYear].filter(Boolean).join(" ") || null;
                  const toDate = entry.isCurrent ? "Present" : ([entry.endMonth, entry.endYear].filter(Boolean).join(" ") || null);
                  return (
                    <EntryCard
                      key={idx}
                      accentColor="bg-bio-green/60"
                      title={entry.company}
                      isCurrent={entry.isCurrent}
                      onEdit={() => openEdit("work", idx)}
                      onDelete={() => deleteWork(idx)}
                      pending={pending}
                    >
                      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-card-border pt-2">
                        <LabeledField label="Job title" value={entry.title} />
                        <LabeledField label="Employment type" value={workTypeLabel(entry.type)} />
                        <LabeledField label="From" value={fromDate} />
                        <LabeledField label="To" value={toDate} />
                        <LabeledField label="Description" value={entry.description} fullWidth />
                      </dl>
                    </EntryCard>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Volunteer ── */}
          <div>
            <SectionHeader
              icon={<Heart className="h-4 w-4 text-bio-green" />}
              label="Volunteer work"
              onAdd={() => openAdd("volunteer")}
            />
            {volunteerEntries.length === 0 ? (
              <p className="text-sm text-bio-text-muted">No volunteer work added yet.</p>
            ) : (
              <div className="space-y-3">
                {volunteerEntries.map(({ entry, idx }) => {
                  const fromDate = [entry.startMonth, entry.startYear].filter(Boolean).join(" ") || null;
                  const toDate = entry.isCurrent ? "Present" : ([entry.endMonth, entry.endYear].filter(Boolean).join(" ") || null);
                  return (
                    <EntryCard
                      key={idx}
                      accentColor="bg-bio-green/40"
                      title={entry.company}
                      isCurrent={entry.isCurrent}
                      onEdit={() => openEdit("volunteer", idx)}
                      onDelete={() => deleteWork(idx)}
                      pending={pending}
                    >
                      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-card-border pt-2">
                        <LabeledField label="Role / Title" value={entry.title} />
                        <LabeledField label="From" value={fromDate} />
                        <LabeledField label="To" value={toDate} />
                        <LabeledField label="Description" value={entry.description} fullWidth />
                      </dl>
                    </EntryCard>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      {/* </ProfileSection> */}

      {/* Education modal */}
      <ProfileEditPanel
        title="education"
        actionLabel={isAdding ? "Add" : "Edit"}
        open={isEduModal}
        pending={pending}
        onClose={closeModal}
        onSubmit={handleEduSubmit}
        feedback={<ProfileFormFeedback error={error} success={null} />}
      >
        <EducationForm draft={eduDraft} onChange={setEduDraft} pending={pending} />
      </ProfileEditPanel>

      {/* Work modal */}
      <ProfileEditPanel
        title="work history"
        actionLabel={isAdding ? "Add" : "Edit"}
        open={isWorkModal}
        pending={pending}
        onClose={closeModal}
        onSubmit={handleWorkSubmit}
        feedback={<ProfileFormFeedback error={error} success={null} />}
        wide
      >
        <WorkForm draft={workDraft} onChange={setWorkDraft} pending={pending} showType />
      </ProfileEditPanel>

      {/* Volunteer modal */}
      <ProfileEditPanel
        title="volunteer experience"
        actionLabel={isAdding ? "Add" : "Edit"}
        open={isVolunteerModal}
        pending={pending}
        onClose={closeModal}
        onSubmit={handleWorkSubmit}
        feedback={<ProfileFormFeedback error={error} success={null} />}
        wide
      >
        <WorkForm draft={workDraft} onChange={setWorkDraft} pending={pending} showType={false} />
      </ProfileEditPanel>
    </>
  );
}
