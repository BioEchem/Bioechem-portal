import type {
  EducationEntry,
  EmergencyContact,
  UpdateAvatarBody,
  UpdateBackgroundProfileBody,
  UpdateEmergencyContactsBody,
  UpdateInternshipBody,
  UpdatePersonalProfileBody,
  UpdateProfileRequestBody,
  UpdateSchoolProfileBody,
  WorkEntry,
} from "@/lib/profile/types";

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function parseOptionalInt(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isNaN(value) ? undefined : value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function parseEmergencyContacts(value: unknown): EmergencyContact[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const contacts: EmergencyContact[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return undefined;
    const record = item as Record<string, unknown>;
    const name = trimOrNull(record.name);
    const phone = trimOrNull(record.phone);
    const relationship = trimOrNull(record.relationship);
    if (!name || !phone) return undefined;
    contacts.push({
      name,
      phone,
      relationship: relationship ?? "",
    });
  }

  return contacts;
}

function parsePersonalBody(record: Record<string, unknown>): UpdatePersonalProfileBody | null {
  const firstName = trimOrNull(record.firstName);
  const lastName = trimOrNull(record.lastName);
  if (!firstName || !lastName) return null;

  const age = parseOptionalInt(record.age);
  if (age === undefined) return null;

  const body: UpdatePersonalProfileBody = {
    section: "personal",
    firstName,
    lastName,
    middleName: trimOrNull(record.middleName),
    age,
    addressStreet: trimOrNull(record.addressStreet),
    addressApt: trimOrNull(record.addressApt),
    addressCity: trimOrNull(record.addressCity),
    addressState: trimOrNull(record.addressState),
    addressCountry: trimOrNull(record.addressCountry),
    addressZip: trimOrNull(record.addressZip),
    phone: trimOrNull(record.phone),
    gender: trimOrNull(record.gender),
    bio: trimOrNull(record.bio),
  };
  if ("avatarUrl" in record) {
    body.avatarUrl = trimOrNull(record.avatarUrl);
  }
  return body;
}

function parseSchoolBody(record: Record<string, unknown>): UpdateSchoolProfileBody | null {
  const schoolId = trimOrNull(record.schoolId);
  const otherSchoolName = trimOrNull(record.otherSchoolName);
  const cohortId = trimOrNull(record.cohortId);
  const emergencyContacts = parseEmergencyContacts(record.emergencyContacts);

  if (record.emergencyContacts !== undefined && emergencyContacts === undefined) {
    return null;
  }

  return {
    section: "school",
    schoolId,
    cohortId,
    otherSchoolName,
    state: trimOrNull(record.state),
    schoolCountry: trimOrNull(record.schoolCountry),
    grade: trimOrNull(record.grade),
    emergencyContacts: emergencyContacts ?? [],
  };
}

function parseEducationEntry(item: unknown): EducationEntry | null {
  if (!item || typeof item !== "object") return null;
  const r = item as Record<string, unknown>;
  const institution = trimOrNull(r.institution);
  if (!institution) return null;
  return {
    institution,
    degree: trimOrNull(r.degree),
    fieldOfStudy: trimOrNull(r.fieldOfStudy),
    startYear: trimOrNull(r.startYear),
    endYear: trimOrNull(r.endYear),
    isCurrent: Boolean(r.isCurrent),
  };
}

function parseWorkEntry(item: unknown): WorkEntry | null {
  if (!item || typeof item !== "object") return null;
  const r = item as Record<string, unknown>;
  const company = trimOrNull(r.company);
  if (!company) return null;
  return {
    company,
    title: trimOrNull(r.title),
    type: trimOrNull(r.type),
    startMonth: trimOrNull(r.startMonth),
    startYear: trimOrNull(r.startYear),
    endMonth: trimOrNull(r.endMonth),
    endYear: trimOrNull(r.endYear),
    isCurrent: Boolean(r.isCurrent),
    description: trimOrNull(r.description),
  };
}

function parseBackgroundBody(record: Record<string, unknown>): UpdateBackgroundProfileBody {
  const body: UpdateBackgroundProfileBody = { section: "background" };

  if (Array.isArray(record.education)) {
    body.education = record.education
      .map(parseEducationEntry)
      .filter((e): e is EducationEntry => e !== null);
  }

  if (Array.isArray(record.workHistory)) {
    body.workHistory = record.workHistory
      .map(parseWorkEntry)
      .filter((e): e is WorkEntry => e !== null);
  }

  if ("resumeUrl" in record) {
    body.resumeUrl = trimOrNull(record.resumeUrl);
  }

  return body;
}

function parseEmergencyContactsBody(
  record: Record<string, unknown>,
): UpdateEmergencyContactsBody | null {
  const emergencyContacts = parseEmergencyContacts(record.emergencyContacts);
  if (emergencyContacts === undefined) return null;
  return { section: "emergency_contacts", emergencyContacts };
}

function parseAvatarBody(record: Record<string, unknown>): UpdateAvatarBody {
  return { section: "avatar", avatarUrl: trimOrNull(record.avatarUrl) };
}

function parseInternshipBody(record: Record<string, unknown>): UpdateInternshipBody {
  return { section: "internship", interestedInInternship: Boolean(record.interestedInInternship) };
}

export function parseUpdateProfileBody(body: unknown): UpdateProfileRequestBody | null {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const section = record.section;

  if (section === "personal") return parsePersonalBody(record);
  if (section === "school") return parseSchoolBody(record);
  if (section === "background") return parseBackgroundBody(record);
  if (section === "emergency_contacts") return parseEmergencyContactsBody(record);
  if (section === "avatar") return parseAvatarBody(record);
  if (section === "internship") return parseInternshipBody(record);

  return null;
}
