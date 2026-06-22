import type { ApprovalStatus } from "@/lib/auth/session";
import type { CohortOption, SchoolOption } from "@/lib/schools/types";

export type { CohortOption, SchoolOption };

export type EmergencyContact = {
  name: string;
  phone: string;
  relationship: string;
};

export type EducationEntry = {
  institution: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startYear?: string | null;
  endYear?: string | null;
  isCurrent: boolean;
};

export type WorkEntry = {
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

export type ProfileSummaryData = {
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  phone: string | null;
  address_street: string | null;
  address_apt: string | null;
  address_city: string | null;
  address_state: string | null;
  address_country: string | null;
  address_zip: string | null;
  state: string | null;
  gender: string | null;
  email: string | null;
  role: string | null;
  age: number | null;
  school_id: string | null;
  other_school_name: string | null;
  cohort_id: string | null;
  emergency_contacts: EmergencyContact[] | null;
  approval_status: ApprovalStatus | null;
  avatar_url: string | null;
  bio: string | null;
  grade: string | null;
  school_country: string | null;
  resume_url: string | null;
  education_background: EducationEntry[] | null;
  work_experience: WorkEntry[] | null;
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

export type UpdateProfileRequestBody =
  | UpdatePersonalProfileBody
  | UpdateSchoolProfileBody
  | UpdateBackgroundProfileBody
  | UpdateEmergencyContactsBody
  | UpdateAvatarBody;

export type UpdateProfileSuccessResponse = {
  ok: true;
  section: "personal" | "school" | "background" | "emergency_contacts" | "avatar";
};
