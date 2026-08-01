/**
 * Shared start/end date ordering checks, used both client-side (for inline
 * error messages) and server-side (to keep API routes safe against direct
 * calls that skip the UI). A missing side is always considered valid — these
 * only fire once both ends of a range are actually provided.
 */

/** ISO/`yyyy-mm-dd` date strings, e.g. cohort start_date/end_date. */
export function isDateOrderValid(
  start: string | null | undefined,
  end: string | null | undefined,
): boolean {
  if (!start || !end) return true;
  return new Date(end).getTime() >= new Date(start).getTime();
}

/** Plain year strings, e.g. education startYear/endYear. */
export function isYearOrderValid(
  startYear: string | null | undefined,
  endYear: string | null | undefined,
): boolean {
  if (!startYear || !endYear) return true;
  return Number(endYear) >= Number(startYear);
}

/** Month+year pairs, e.g. work history start/end. Month is optional even when year is set. */
export function isMonthYearOrderValid(
  startMonth: string | null | undefined,
  startYear: string | null | undefined,
  endMonth: string | null | undefined,
  endYear: string | null | undefined,
): boolean {
  if (!startYear || !endYear) return true;
  const sy = Number(startYear);
  const ey = Number(endYear);
  if (ey !== sy) return ey > sy;
  if (!startMonth || !endMonth) return true;
  return Number(endMonth) >= Number(startMonth);
}
