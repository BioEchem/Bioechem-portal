export const SHAREHOLDER_FOLDER_CATEGORIES = [
  { value: "meeting_followup", label: "Meeting Follow-ups" },
  { value: "contract", label: "Contracts" },
  { value: "invoice", label: "Invoices" },
  { value: "payment_proof", label: "Payment Proof" },
  { value: "grant_app", label: "Grant Applications" },
  { value: "other", label: "Other" },
] as const;

export type ShareholderFolderCategory = (typeof SHAREHOLDER_FOLDER_CATEGORIES)[number]["value"];

export const SHAREHOLDER_FOLDER_CATEGORY_VALUES = SHAREHOLDER_FOLDER_CATEGORIES.map((c) => c.value);

export function shareholderFolderCategoryLabel(value: string): string {
  return SHAREHOLDER_FOLDER_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
