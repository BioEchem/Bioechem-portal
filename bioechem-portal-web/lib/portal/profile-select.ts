/** Columns loaded on the profile/account page (full profile). */
export const PORTAL_PROFILE_SELECT =
  "full_name, first_name, last_name, middle_name, phone, gender, email, role, age, school_id, other_school_name, cohort_id, approval_status, avatar_url, bio, grade, resume_url, interested_in_internship, profile_addresses(*), profile_education(*), profile_work_experience(*), profile_emergency_contacts(*), schools(name), cohorts(name)";

/** Fields needed to check whether a participant profile is complete. */
export const PORTAL_PROFILE_COMPLETION_SELECT =
  "role, first_name, last_name, age, phone, school_id, other_school_name, cohort_id, profile_addresses(street,apt,city,state,country,zip,reg_state), profile_emergency_contacts(name,phone,relationship)";

export const PORTAL_SCHOOLS_SELECT = "id, name";
export const PORTAL_COHORTS_SELECT = "id, school_id, name";
