import type { ApprovalStatus } from "@/lib/auth/session";
import type { CohortOption, SchoolOption } from "@/lib/schools/types";

export type { CohortOption, SchoolOption };

export type EmergencyContact = {
  name: string;
  phone: string;
  relationship: string;
};

export type EducationEntry = {
  id?: string;
  institution: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startYear?: string | null;
  endYear?: string | null;
  isCurrent: boolean;
};

export type WorkEntry = {
  id?: string;
  company: string;
  title?: string | null;
  type?: string | null; // "job" | "volunteer" | "internship" | "freelance" | "other"
  startMonth?: string | null;
  startYear?: string | null;
  endMonth?: string | null;
  endYear?: string | null;
  isCurrent: boolean;
  description?: string | null;
};

/** Row shape returned from the profile_addresses table (via PostgREST join). */
export type ProfileAddressRow = {
  street: string | null;
  apt: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string | null;
  reg_state: string | null;
  school_country: string | null;
};

/** Row shape returned from profile_education (via PostgREST join). */
export type ProfileEducationRow = {
  id: string;
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_year: string | null;
  end_year: string | null;
  is_current: boolean;
  position: number;
};

/** Row shape returned from profile_work_experience (via PostgREST join). */
export type ProfileWorkRow = {
  id: string;
  company: string;
  title: string | null;
  type: string | null;
  start_month: string | null;
  start_year: string | null;
  end_month: string | null;
  end_year: string | null;
  is_current: boolean;
  description: string | null;
  position: number;
};

/** Row shape returned from profile_emergency_contacts (via PostgREST join). */
export type ProfileEmergencyContactRow = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  position: number;
};

export type ProfileSummaryData = {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  phone: string | null;
  gender: string | null;
  email: string | null;
  role: string | null;
  age: number | null;
  school_id: string | null;
  other_school_name: string | null;
  cohort_id: string | null;
  approval_status: ApprovalStatus | null;
  avatar_url: string | null;
  bio: string | null;
  grade: string | null;
  resume_url: string | null;
  // joined tables
  interested_in_internship: boolean;
  profile_addresses: ProfileAddressRow | null;
  profile_education: ProfileEducationRow[];
  profile_work_experience: ProfileWorkRow[];
  profile_emergency_contacts: ProfileEmergencyContactRow[];
  schools: { name: string } | { name: string }[] | null;
  cohorts: { name: string } | { name: string }[] | null;
};

export type UpdatePersonalProfileBody = {
  section: "personal";
  firstName: string;
  lastName: string;
  middleName?: string | null;
  age?: number | null;
  addressStreet?: string | null;
  addressApt?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressCountry?: string | null;
  addressZip?: string | null;
  phone?: string | null;
  gender?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
};

export type UpdateSchoolProfileBody = {
  section: "school";
  schoolId?: string | null;
  cohortId?: string | null;
  otherSchoolName?: string | null;
  state?: string | null;
  schoolCountry?: string | null;
  grade?: string | null;
  emergencyContacts?: EmergencyContact[];
};

export type UpdateBackgroundProfileBody = {
  section: "background";
  education?: EducationEntry[];
  workHistory?: WorkEntry[];
  resumeUrl?: string | null;
};

export type UpdateEmergencyContactsBody = {
  section: "emergency_contacts";
  emergencyContacts: EmergencyContact[];
};

export type UpdateAvatarBody = {
  section: "avatar";
  avatarUrl: string | null;
};

export type UpdateInternshipBody = {
  section: "internship";
  interestedInInternship: boolean;
};

export type UpdateProfileRequestBody =
  | UpdatePersonalProfileBody
  | UpdateSchoolProfileBody
  | UpdateBackgroundProfileBody
  | UpdateEmergencyContactsBody
  | UpdateAvatarBody
  | UpdateInternshipBody;

export type UpdateProfileSuccessResponse = {
  ok: true;
  section: "personal" | "school" | "background" | "emergency_contacts" | "avatar" | "internship";
};
