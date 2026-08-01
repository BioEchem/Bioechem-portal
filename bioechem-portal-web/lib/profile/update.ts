import { roleAllowsCohortOnSignup, roleRequiresPartnerSchool } from "@/lib/auth/roles";
import { enrollUserInCohort } from "@/lib/cohorts/enroll";
import {
  hasRequiredAddress,
  normalizeAddressInput,
} from "@/lib/profile/address";
import { isValidGender } from "@/lib/profile/gender";
import { buildFullName } from "@/lib/profile/name";
import { isMonthYearOrderValid, isYearOrderValid } from "@/lib/validation/dates";
import type {
  EducationEntry,
  EmergencyContact,
  UpdateEmergencyContactsBody,
  UpdateInternshipBody,
  UpdatePersonalProfileBody,
  UpdateProfileRequestBody,
  UpdateSchoolProfileBody,
  WorkEntry,
} from "@/lib/profile/types";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { SupabaseServer } from "@/lib/supabase/types";

export type UpdateProfileResult =
  | { ok: true; section: "personal" | "school" | "background" | "emergency_contacts" | "avatar" | "internship" }
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
  contacts: EmergencyContact[],
): Promise<UpdateProfileResult> {
  if (role !== "participant") {
    return { ok: false, message: "Emergency contacts are only for participants.", status: 400 };
  }

  if (contacts.length === 0) {
    return { ok: false, message: "At least one emergency contact is required.", status: 400 };
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

  const { error: delErr } = await supabase
    .from("profile_emergency_contacts")
    .delete()
    .eq("user_id", userId);
  if (delErr) return { ok: false, message: delErr.message, status: 400 };

  const rows = contacts.map((c, i) => ({
    user_id: userId,
    name: c.name.trim(),
    phone: c.phone.trim(),
    relationship: c.relationship.trim(),
    position: i,
  }));

  const { error: insErr } = await supabase.from("profile_emergency_contacts").insert(rows);
  if (insErr) return { ok: false, message: insErr.message, status: 400 };

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

    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        first_name: validated.firstName,
        middle_name: validated.middleName,
        last_name: validated.lastName,
        full_name: buildFullName(validated.firstName, validated.middleName, validated.lastName),
        phone: validated.phone,
        gender: validated.gender,
        bio: validated.bio ?? null,
        ...(role === "participant" ? { age: validated.age } : {}),
        ...("avatarUrl" in validated ? { avatar_url: validated.avatarUrl } : {}),
        updated_at: now,
      })
      .eq("id", userId);

    if (profErr) return { ok: false, message: profErr.message, status: 400 };

    // Upsert address into profile_addresses
    const { error: addrErr } = await supabase
      .from("profile_addresses")
      .upsert(
        {
          user_id: userId,
          street: validated.address.street,
          apt: validated.address.apt,
          city: validated.address.city,
          state: validated.address.state,
          country: validated.address.country,
          zip: validated.address.zip,
          updated_at: now,
        },
        { onConflict: "user_id" },
      );

    if (addrErr) return { ok: false, message: addrErr.message, status: 400 };

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

  if (input.section === "internship") {
    const { error } = await supabase
      .from("profiles")
      .update({ interested_in_internship: input.interestedInInternship, updated_at: now })
      .eq("id", userId);
    if (error) return { ok: false, message: error.message, status: 400 };
    return { ok: true, section: "internship" };
  }

  if (input.section === "emergency_contacts") {
    return updateEmergencyContacts(supabase, userId, role, input.emergencyContacts);
  }

  if (input.section === "background") {
    for (const e of input.education ?? []) {
      if (!isYearOrderValid(e.startYear, e.isCurrent ? null : e.endYear)) {
        return { ok: false, message: `End year must be on or after start year for "${e.institution}".`, status: 400 };
      }
    }
    for (const w of input.workHistory ?? []) {
      if (
        !isMonthYearOrderValid(
          w.startMonth,
          w.startYear,
          w.isCurrent ? null : w.endMonth,
          w.isCurrent ? null : w.endYear,
        )
      ) {
        return { ok: false, message: `End date must be on or after start date for "${w.company}".`, status: 400 };
      }
    }

    // Update resume_url on profiles
    if ("resumeUrl" in input) {
      const { error } = await supabase
        .from("profiles")
        .update({ resume_url: input.resumeUrl, updated_at: now })
        .eq("id", userId);
      if (error) return { ok: false, message: error.message, status: 400 };
    }

    // Replace education rows
    const education: EducationEntry[] = input.education ?? [];
    const { error: delEduErr } = await supabase
      .from("profile_education")
      .delete()
      .eq("user_id", userId);
    if (delEduErr) return { ok: false, message: delEduErr.message, status: 400 };

    if (education.length > 0) {
      const eduRows = education.map((e, i) => ({
        user_id: userId,
        institution: e.institution,
        degree: e.degree ?? null,
        field_of_study: e.fieldOfStudy ?? null,
        start_year: e.startYear ?? null,
        end_year: e.endYear ?? null,
        is_current: e.isCurrent,
        position: i,
      }));
      const { error: insEduErr } = await supabase.from("profile_education").insert(eduRows);
      if (insEduErr) return { ok: false, message: insEduErr.message, status: 400 };
    }

    // Replace work experience rows
    const workHistory: WorkEntry[] = input.workHistory ?? [];
    const { error: delWorkErr } = await supabase
      .from("profile_work_experience")
      .delete()
      .eq("user_id", userId);
    if (delWorkErr) return { ok: false, message: delWorkErr.message, status: 400 };

    if (workHistory.length > 0) {
      const workRows = workHistory.map((w, i) => ({
        user_id: userId,
        company: w.company,
        title: w.title ?? null,
        type: w.type ?? null,
        start_month: w.startMonth ?? null,
        start_year: w.startYear ?? null,
        end_month: w.endMonth ?? null,
        end_year: w.endYear ?? null,
        is_current: w.isCurrent,
        description: w.description ?? null,
        position: i,
      }));
      const { error: insWorkErr } = await supabase.from("profile_work_experience").insert(workRows);
      if (insWorkErr) return { ok: false, message: insWorkErr.message, status: 400 };
    }

    return { ok: true, section: "background" };
  }

  // School section
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

  // Cohort selection is optional. When provided, enroll the user first
  // (creating/reactivating a real cohort_enrollments row so they actually get
  // cohort access) before persisting profiles.cohort_id — kept in sync for
  // display/rostering (dashboard label, school-admin cohort counts) — so we
  // don't label the profile with a cohort the enrollment attempt failed for.
  if (cohortId && roleAllowsCohortOnSignup(role)) {
    const admin = createServiceRoleClient();
    if (!admin) return { ok: false, message: "Server misconfiguration.", status: 400 };

    const { data: who } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();

    const enrollResult = await enrollUserInCohort(
      supabase,
      admin,
      userId,
      role as "participant" | "teacher",
      cohortId,
      who?.full_name?.trim() || who?.email || "A user",
    );

    if (!enrollResult.ok) return { ok: false, message: enrollResult.message, status: 400 };
  }

  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      school_id: schoolId,
      cohort_id: cohortId,
      other_school_name: otherSchoolName,
      grade: validated.grade ?? null,
      updated_at: now,
    })
    .eq("id", userId);

  if (profErr) return { ok: false, message: profErr.message, status: 400 };

  // Upsert reg_state + school_country into profile_addresses
  const { error: addrErr } = await supabase
    .from("profile_addresses")
    .upsert(
      {
        user_id: userId,
        reg_state: validated.state ?? null,
        school_country: validated.schoolCountry ?? null,
        updated_at: now,
      },
      { onConflict: "user_id" },
    );

  if (addrErr) return { ok: false, message: addrErr.message, status: 400 };

  // Update emergency contacts if provided with school section
  if (validated.emergencyContacts && validated.emergencyContacts.length > 0) {
    const result = await updateEmergencyContacts(
      supabase,
      userId,
      role,
      validated.emergencyContacts,
    );
    if (!result.ok) return result;
  }

  return { ok: true, section: "school" };
}
