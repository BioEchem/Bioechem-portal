/** Short locale date for tables and lists (e.g. "Jun 1, 2026"). */
export function formatShortDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
