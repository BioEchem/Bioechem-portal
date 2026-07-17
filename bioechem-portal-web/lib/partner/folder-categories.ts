export const PARTNER_TYPES = [
  { value: "industry", label: "Industry partner" },
  { value: "government", label: "Government partner" },
] as const;

export type PartnerType = (typeof PARTNER_TYPES)[number]["value"];

export function partnerTypeLabel(value: string | null): string {
  return PARTNER_TYPES.find((t) => t.value === value)?.label ?? "Unspecified";
}

export const PARTNER_FOLDER_CATEGORIES = [
  { value: "meeting_followup", label: "Meeting Follow-ups" },
  { value: "contract", label: "Contracts" },
  { value: "invoice", label: "Invoices" },
  { value: "payment_proof", label: "Payment Proof" },
  { value: "grant_app", label: "Grant Applications" },
  { value: "other", label: "Other (W9, etc.)" },
] as const;

export type PartnerFolderCategory = (typeof PARTNER_FOLDER_CATEGORIES)[number]["value"];

export const PARTNER_FOLDER_CATEGORY_VALUES = PARTNER_FOLDER_CATEGORIES.map((c) => c.value);

export function partnerFolderCategoryLabel(value: string): string {
  return PARTNER_FOLDER_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
