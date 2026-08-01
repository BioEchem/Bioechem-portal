export const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
] as const;

const VALID_GENDER_VALUES = new Set<string>(
  GENDER_OPTIONS.map((option) => option.value).filter((value) => value !== ""),
);

export function isValidGender(value: string | null | undefined): boolean {
  if (!value) return true;
  return VALID_GENDER_VALUES.has(value);
}
