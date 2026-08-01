/** Partner school and cohort options used in signup and profile forms. */

export type SchoolOption = {
  id: string;
  name: string;
};

export type CohortOption = {
  id: string;
  schoolId: string;
  name: string;
};
