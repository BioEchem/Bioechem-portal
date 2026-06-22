import type { EducationEntry } from "@/lib/profile/types";

export const DEGREE_OPTIONS = [
  { value: "", label: "Select degree (optional)" },
  { value: "high_school", label: "High School Diploma / GED" },
  { value: "associate", label: "Associate's Degree" },
  { value: "bachelor", label: "Bachelor's Degree" },
  { value: "master", label: "Master's Degree" },
  { value: "doctoral", label: "Doctoral Degree (PhD)" },
  { value: "professional", label: "Professional Degree (MD, JD, etc.)" },
  { value: "certificate", label: "Certificate / Diploma" },
  { value: "some_college", label: "Some College (No Degree)" },
  { value: "other", label: "Other" },
] as const;

export function parseEducationEntries(value: unknown): EducationEntry[] {
  if (!Array.isArray(value)) return [];
  const result: EducationEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const institution = typeof r.institution === "string" ? r.institution.trim() : "";
    if (!institution) continue;
    result.push({
      institution,
      degree: typeof r.degree === "string" ? r.degree.trim() || null : null,
      fieldOfStudy: typeof r.fieldOfStudy === "string" ? r.fieldOfStudy.trim() || null : null,
      startYear: typeof r.startYear === "string" ? r.startYear.trim() || null : null,
      endYear: typeof r.endYear === "string" ? r.endYear.trim() || null : null,
      isCurrent: Boolean(r.isCurrent),
    });
  }
  return result;
}

export function emptyEducationEntry(): EducationEntry {
  return {
    institution: "",
    degree: null,
    fieldOfStudy: null,
    startYear: null,
    endYear: null,
    isCurrent: false,
  };
}
