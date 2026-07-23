/** Percentage score from earned/max points, or null if not computable. */
export function pct(earned: number | null, max: number | null): number | null {
  if (earned == null || max == null || max === 0) return null;
  return Math.round((earned / max) * 100);
}

/** Flat A/B/C/D/F cutoff (>=90/80/70/60) applied to a percentage. Null if the percentage is null. */
export function letterGrade(p: number | null): string | null {
  if (p == null) return null;
  if (p >= 90) return "A";
  if (p >= 80) return "B";
  if (p >= 70) return "C";
  if (p >= 60) return "D";
  return "F";
}
