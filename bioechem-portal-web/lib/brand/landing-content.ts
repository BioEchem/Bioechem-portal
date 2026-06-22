/**
 * All editable landing-page content lives here.
 * Swap out placeholders with real copy when ready — no JSX changes needed.
 */

export const HERO = {
  eyebrow: "Clean Tech · STEM Education",
  headline: "Empowering the Next Generation of Scientists",
  subheadline:
    "BioEchem partners with schools to deliver hands-on biochemistry and clean-tech curriculum. This portal connects participants, teachers, and partner schools.",
} as const;

export const STATS: { value: string; label: string }[] = [
  { value: "20+", label: "Partner schools" },
  { value: "500+", label: "Students enrolled" },
  { value: "10+", label: "STEM programs" },
  { value: "5", label: "States reached" },
];

export const ABOUT = {
  heading: "Our Mission",
  body: "BioEchem is a Boston-based education company dedicated to making biochemistry and clean technology accessible to students across the country. Through hands-on labs, industry partnerships, and rigorous curriculum, we prepare the next generation for careers in STEM.",
  linkLabel: "Learn more at bioechem.com",
} as const;

/** Upcoming and recent events. Set `date` to ISO format: "2026-07-15". */
export const EVENTS: {
  title: string;
  date: string;
  location: string;
  description: string;
  link?: string;
}[] = [
  {
    title: "Summer STEM Kickoff Workshop",
    date: "2026-07-15",
    location: "Boston, MA",
    description:
      "An in-person workshop for partner-school teachers to preview the new clean-tech lab curriculum launching this fall.",
  },
  {
    title: "BioEchem Webinar: Clean Energy in the Classroom",
    date: "2026-07-28",
    location: "Online",
    description:
      "A live session covering how to integrate renewable energy experiments into existing science curricula.",
  },
  {
    title: "Partner School Orientation — Fall 2026",
    date: "2026-08-20",
    location: "Online",
    description:
      "Onboarding session for all new partner schools joining the program this academic year.",
  },
];

/**
 * Past events with optional photos.
 * - `images`: array of public photo URLs (Supabase storage, CDN, etc.).
 *   Multiple photos get an auto-advancing carousel with arrows and a lightbox.
 *   Leave empty and a branded placeholder is shown automatically.
 * - `highlights`: 2–4 bullet points shown when the card is expanded.
 * - `link`: optional link to a recap article, album, or recording.
 */
export const PAST_EVENTS: {
  title: string;
  date: string;
  location: string;
  description: string;
  images?: string[];
  highlights?: string[];
  link?: string;
}[] = [
  {
    title: "Digital Ready Sustainability Workforce Training Newsletter",
    date: "2026-05-10",
    location: "Boston, MA",
    description:
      "Students from six partner schools presented their clean-tech lab projects to industry judges and peers.",
    images: ["https://drive.google.com/file/d/1XegvsQDt2nxtMdize27t8Nysmhw8zbKW/view?usp=sharing",
      "https://drive.google.com/file/d/1MXUqbyDFEuLBmpsYvps8O5NZsdvH8nqZ/view?usp=sharing",
    "https://drive.google.com/file/d/1cct-wzY-GgVQYAIFBM1j_g2EwZW6x55k/view?usp=sharing"],
    highlights: [
      "Over 120 student participants",
      "Projects spanning solar, biogas, and water filtration",
      "Top 3 projects awarded scholarships",
    ],
  },
  {
    title: "Teacher Training Day — Winter 2026",
    date: "2026-01-18",
    location: "Online",
    description:
      "A full-day virtual training where teachers explored the updated biochemistry curriculum and new lab kit guides.",
    highlights: [
      "45 teachers from 12 schools",
      "New lab safety protocols introduced",
      "Q&A with BioEchem curriculum team",
    ],
  },
  {
    title: "Fall Kickoff Assembly 2025",
    date: "2025-09-12",
    location: "Boston, MA",
    description:
      "Welcome assembly for the 2025–2026 cohort, introducing new partner schools and the year's program goals.",
    highlights: [
      "8 new partner schools joined",
      "Keynote from a clean-tech industry leader",
      "Students received lab starter kits",
    ],
  },
];

/**
 * Newsletters — three ways to provide content:
 *
 * 1. `link`  — URL to a hosted PDF or article; clicking the row opens it in a new tab.
 * 2. `body`  — Paste the full newsletter text here; clicking the row opens a modal.
 *              Use blank lines between paragraphs. Headings start with "# ".
 * 3. Neither — Shows a "Coming soon" badge and an email link when expanded.
 *
 * `excerpt` is always shown as the preview line regardless of which option you use.
 */
export const NEWSLETTERS: {
  title: string;
  date: string;
  excerpt: string;
  link?: string;
  body?: string;
}[] = [
  {
    title: "Digital Ready Sustainability Workforce Training Newsletter",
    date: "2026-06-10",
    excerpt:
      "Highlights from our spring cohorts, new school partnerships, and a look at upcoming summer programming.",
    // Paste your newsletter text below (remove the comment markers):
    // body: `
    // # Spring 2026 Newsletter
    //
    // Welcome to our spring update...
    //
    // ## New Partner Schools
    // We welcomed three new schools this semester...
    // `,
    link: "https://drive.google.com/file/d/1uWSMz0XVM4ibh_1p9fvcedY8KVfEc0jd/view?usp=sharing",
  },
  {
    title: "Winter 2025 Newsletter",
    date: "2025-12-10",
    excerpt:
      "Year-end recap of student achievements, curriculum updates, and what's coming in 2026.",
  },
  {
    title: "Fall 2025 Newsletter",
    date: "2025-09-05",
    excerpt:
      "Welcome to the new academic year — new partner schools, expanded lab kits, and teacher spotlights.",
  },
];
