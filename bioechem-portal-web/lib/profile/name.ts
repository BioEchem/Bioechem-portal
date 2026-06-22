const EMPTY = "—";

/** Splits a full name into first and last for display when separate fields are unset. */
export function splitFullName(fullName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName?.trim() ?? "";
  if (!trimmed) {
    return { firstName: EMPTY, lastName: EMPTY };
  }

  const parts = trimmed.split(/\s+/);
  const firstName = parts[0] ?? EMPTY;
  const lastName = parts.slice(1).join(" ") || EMPTY;

  return { firstName, lastName };
}

/** Builds full_name from name parts for storage. */
export function buildFullName(
  firstName: string,
  middleName: string | null | undefined,
  lastName: string,
): string {
  return [firstName, middleName?.trim(), lastName].filter(Boolean).join(" ").trim();
}
