/** Columns loaded on the profile page. */
export const PORTAL_PROFILE_SELECT =
  "full_name, first_name, last_name, middle_name, phone, address_street, address_apt, address_city, address_state, address_country, address_zip, state, gender, email, role, age, school_id, other_school_name, cohort_id, emergency_contacts, approval_status, avatar_url, bio, grade, school_country, resume_url, education_background, work_experience, schools(name), cohorts(name)";

/** Fields needed to check whether a participant profile is complete. */
export const PORTAL_PROFILE_COMPLETION_SELECT =
  "role, first_name, last_name, age, address_street, address_apt, address_city, address_state, address_country, address_zip, phone, state, school_id, other_school_name, cohort_id, emergency_contacts";

export const PORTAL_SCHOOLS_SELECT = "id, name";
export const PORTAL_COHORTS_SELECT = "id, school_id, name";
