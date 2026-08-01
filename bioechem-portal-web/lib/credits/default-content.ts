export type CreditActionItem = { action: string; credits: string; note?: string };

/** Fallback content shown if the credits_page_content table has no row yet. */
export const DEFAULT_CREDITS_INTRO =
  "BioEchem wants to recognize students and teachers who stay active and engaged on the portal — keeping your profile current, sharing feedback, and following through on your program. Every time you do one of the actions below, you earn credits. Credits can later be redeemed for reimbursement (e.g. program-related expenses) or to purchase BioEchem items.";

export const DEFAULT_CREDITS_CLAIM =
  "Since this isn't automated yet, keep a note of what you did and when (e.g. \"updated my career path on March 3\"), then email us to claim your credits.";

export const DEFAULT_CREDITS_ACTIONS: CreditActionItem[] = [
  {
    action: "Update your Career Path & Interests",
    credits: "1 credit",
    note: "Each time you meaningfully update it in a cohort — e.g. new interests, plans, or an attached document.",
  },
  {
    action: "Submit program feedback or a survey",
    credits: "2 credits",
    note: "Halfway, final, or custom surveys sent by BioEchem.",
  },
  {
    action: "Complete your profile & background",
    credits: "1 credit",
    note: "Filling in your background section (education, work experience, etc.) once it's fully complete.",
  },
  {
    action: "Complete a program / earn a certificate",
    credits: "5 credits",
    note: "Awarded when you finish a cohort and receive your certificate.",
  },
];
