/** Short locale date for tables and lists (e.g. "Jun 1, 2026"). */
export function formatShortDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Short locale date + time (e.g. "Jun 1, 2026, 3:45 PM"). */
export function formatShortDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
