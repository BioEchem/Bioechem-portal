import { roleAllowsCohortOnSignup, roleRequiresPartnerSchool } from "@/lib/auth/roles";
import {
  hasRequiredAddress,
  normalizeAddressInput,
} from "@/lib/profile/address";
import { isValidGender } from "@/lib/profile/gender";
import { buildFullName } from "@/lib/profile/name";
import type {
  EducationEntry,
  EmergencyContact,
  UpdateAvatarBody,
  UpdateEmergencyContactsBody,
  UpdatePersonalProfileBody,
  UpdateProfileRequestBody,
  UpdateSchoolProfileBody,
  WorkEntry,
} from "@/lib/profile/types";
import type { SupabaseServer } from "@/lib/supabase/types";

export type UpdateProfileResult =
  | { ok: true; section: "personal" | "school" | "background" | "emergency_contacts" | "avatar" }
  | { ok: false; message: string; status: 400 };

const MAX_EMERGENCY_CONTACTS = 3;

function validatePersonalInput(
  input: UpdatePersonalProfileBody,
  role: string,
): UpdateProfileResult | (UpdatePersonalProfileBody & { address: ReturnType<typeof normalizeAddressInput> }) {
  if (!input.firstName || !input.lastName) {
    return { ok: false, message: "First and last name are required.", status: 400 };
  }

  if (!isValidGender(input.gender)) {
    return { ok: false, message: "Invalid gender value.", status: 400 };
  }

  const address = normalizeAddressInput({
    street: input.addressStreet,
    apt: input.addressApt,
    city: input.addressCity,
    state: input.addressState,
    country: input.addressCountry,
    zip: input.addressZip,
  });

  if (role === "participant") {
    if (input.age == null || input.age < 1) {
      return { ok: false, message: "Age is required for participants.", status: 400 };
    }
    if (!hasRequiredAddress(address)) {
      return {
        ok: false,
        message: "Street, city, state, country, and ZIP code are required.",
        status: 400,
      };
    }
    if (!input.phone?.trim()) {
      return { ok: false, message: "Phone number is required for participants.", status: 400 };
    }
  }

  return { ...input, address };
}

async function validateSchoolInput(
  supabase: SupabaseServer,
  input: UpdateSchoolProfileBody,
  role: string,
): Promise<UpdateProfileResult | UpdateSchoolProfileBody> {
  if (!roleRequiresPartnerSchool(role)) {
    return { ok: false, message: "School details cannot be updated for this role.", status: 400 };
  }

  if (input.schoolId && input.otherSchoolName) {
    return {
      ok: false,
      message: "Choose a listed school or enter another school name.",
      status: 400,
    };
  }

  if (input.schoolId) {
    const { data: school } = await supabase
      .from("schools")
      .select("id")
      .eq("id", input.schoolId)
      .eq("is_partner", true)
      .eq("is_active", true)
      .maybeSingle();

    if (!school) {
      return { ok: false, message: "Invalid or inactive partner school.", status: 400 };
    }
  }

  if (input.cohortId) {
    if (!input.schoolId) {
      return { ok: false, message: "Select a school before choosing a class.", status: 400 };
    }

    if (!roleAllowsCohortOnSignup(role)) {
      return { ok: false, message: "Class cannot be set for this role.", status: 400 };
    }

    const { data: cohort } = await supabase
      .from("cohorts")
      .select("id")
      .eq("id", input.cohortId)
      .eq("school_id", input.schoolId)
      .eq("is_active", true)
      .maybeSingle();

    if (!cohort) {
      return { ok: false, message: "Invalid class for the selected school.", status: 400 };
    }
  }

  if (role === "participant" && !input.state?.trim()) {
    return { ok: false, message: "State is required for participants.", status: 400 };
  }

  return input;
}

async function updateEmergencyContacts(
  supabase: SupabaseServer,
  userId: string,
  role: string,
  input: UpdateEmergencyContactsBody,
): Promise<UpdateProfileResult> {
  if (role !== "participant") {
    return { ok: false, message: "Emergency contacts are only for participants.", status: 400 };
  }

  const contacts = input.emergencyContacts;

  if (contacts.length === 0) {
    return {
      ok: false,
      message: "At least one emergency contact is required.",
      status: 400,
    };
  }

  if (contacts.length > MAX_EMERGENCY_CONTACTS) {
    return {
      ok: false,
      message: `You can add up to ${MAX_EMERGENCY_CONTACTS} emergency contacts.`,
      status: 400,
    };
  }

  for (const contact of contacts) {
    if (!contact.name.trim() || !contact.phone.trim() || !contact.relationship.trim()) {
      return {
        ok: false,
        message: "Each contact needs a name, phone number, and relationship.",
        status: 400,
      };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ emergency_contacts: contacts as EmergencyContact[], updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    return { ok: false, message: error.message, status: 400 };
  }

  return { ok: true, section: "emergency_contacts" };
}

/** Updates profile fields for the signed-in user (RLS-enforced). */
export async function updateOwnProfile(
  supabase: SupabaseServer,
  userId: string,
  role: string,
  input: UpdateProfileRequestBody,
): Promise<UpdateProfileResult> {
  const now = new Date().toISOString();

  if (input.section === "personal") {
    const validated = validatePersonalInput(input, role);
    if ("ok" in validated) return validated;

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: validated.firstName,
        middle_name: validated.middleName,
        last_name: validated.lastName,
        full_name: buildFullName(
          validated.firstName,
          validated.middleName,
          validated.lastName,
        ),
        address_street: validated.address.street,
        address_apt: validated.address.apt,
        address_city: validated.address.city,
        address_state: validated.address.state,
        address_country: validated.address.country,
        address_zip: validated.address.zip,
        phone: validated.phone,
        gender: validated.gender,
        bio: validated.bio ?? null,
        ...(role === "participant" ? { age: validated.age } : {}),
        ...("avatarUrl" in validated ? { avatar_url: validated.avatarUrl } : {}),
        updated_at: now,
      })
      .eq("id", userId);

    if (error) {
      return { ok: false, message: error.message, status: 400 };
    }

    return { ok: true, section: "personal" };
  }

  if (input.section === "avatar") {
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: input.avatarUrl, updated_at: now })
      .eq("id", userId);
    if (error) return { ok: false, message: error.message, status: 400 };
    return { ok: true, section: "avatar" };
  }

  if (input.section === "emergency_contacts") {
    const result = await updateEmergencyContacts(supabase, userId, role, input);
    return result;
  }

  if (input.section === "background") {
    const { error } = await supabase
      .from("profiles")
      .update({
        education_background: (input.education ?? []) as EducationEntry[],
        work_experience: (input.workHistory ?? []) as WorkEntry[],
        ...("resumeUrl" in input ? { resume_url: input.resumeUrl } : {}),
        updated_at: now,
      })
      .eq("id", userId);

    if (error) {
      return { ok: false, message: error.message, status: 400 };
    }

    return { ok: true, section: "background" };
  }

  const validated = await validateSchoolInput(supabase, input, role);
  if ("ok" in validated) return validated;

  let schoolId = validated.schoolId;
  let cohortId = validated.cohortId;
  const otherSchoolName = validated.otherSchoolName;

  if (otherSchoolName) {
    schoolId = null;
    cohortId = null;
  } else if (schoolId && !roleAllowsCohortOnSignup(role)) {
    cohortId = null;
  }

  const payload: Record<string, unknown> = {
    school_id: schoolId,
    cohort_id: cohortId,
    other_school_name: otherSchoolName,
    state: validated.state,
    school_country: validated.schoolCountry ?? null,
    grade: validated.grade ?? null,
    updated_at: now,
  };

  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);

  if (error) {
    return { ok: false, message: error.message, status: 400 };
  }

  return { ok: true, section: "school" };
}
