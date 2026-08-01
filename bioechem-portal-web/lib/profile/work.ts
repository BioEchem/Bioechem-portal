import type { ProfileWorkRow, WorkEntry } from "@/lib/profile/types";

export const WORK_TYPE_OPTIONS = [
  { value: "job", label: "Employment" },
  { value: "internship", label: "Internship" },
  { value: "volunteer", label: "Volunteer" },
  { value: "freelance", label: "Freelance / Contract" },
  { value: "other", label: "Other" },
] as const;

export const MONTH_OPTIONS = [
  { value: "", label: "Month" },
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

export function parseWorkEntries(value: unknown): WorkEntry[] {
  if (!Array.isArray(value)) return [];
  const result: WorkEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const company = typeof r.company === "string" ? r.company.trim() : "";
    if (!company) continue;
    result.push({
      company,
      title: typeof r.title === "string" ? r.title.trim() || null : null,
      type: typeof r.type === "string" ? r.type.trim() || null : null,
      startMonth: typeof r.startMonth === "string" ? r.startMonth.trim() || null : null,
      startYear: typeof r.startYear === "string" ? r.startYear.trim() || null : null,
      endMonth: typeof r.endMonth === "string" ? r.endMonth.trim() || null : null,
      endYear: typeof r.endYear === "string" ? r.endYear.trim() || null : null,
      isCurrent: Boolean(r.isCurrent),
      description: typeof r.description === "string" ? r.description.trim() || null : null,
    });
  }
  return result;
}

/** Convert DB rows (snake_case) to form-friendly WorkEntry (camelCase). */
export function workRowsToEntries(rows: ProfileWorkRow[]): WorkEntry[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      id: r.id,
      company: r.company,
      title: r.title,
      type: r.type,
      startMonth: r.start_month,
      startYear: r.start_year,
      endMonth: r.end_month,
      endYear: r.end_year,
      isCurrent: r.is_current,
      description: r.description,
    }));
}

export function emptyWorkEntry(): WorkEntry {
  return {
    company: "",
    title: null,
    startMonth: null,
    startYear: null,
    endMonth: null,
    endYear: null,
    isCurrent: false,
    description: null,
  };
}
