import type { EmergencyContact, ProfileEmergencyContactRow } from "@/lib/profile/types";

export function parseEmergencyContacts(value: unknown): EmergencyContact[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const phone = typeof record.phone === "string" ? record.phone.trim() : "";
      const relationship =
        typeof record.relationship === "string" ? record.relationship.trim() : "";
      if (!name || !phone) return null;
      return { name, phone, relationship };
    })
    .filter((item): item is EmergencyContact => item !== null);
}

/** Convert DB rows (ordered by position) to EmergencyContact array for forms. */
export function emergencyContactRowsToContacts(rows: ProfileEmergencyContactRow[]): EmergencyContact[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((r) => ({ name: r.name, phone: r.phone, relationship: r.relationship }));
}

export function emptyEmergencyContact(): EmergencyContact {
  return { name: "", phone: "", relationship: "" };
}
