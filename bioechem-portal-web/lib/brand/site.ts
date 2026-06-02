/** Shared brand + links aligned with https://www.bioechem.com/ */

export const MAIN_SITE_URL = "https://www.bioechem.com";

export const MAIN_SITE_CONTACT = {
  address: "292 D str. #2B, Boston, MA 02127",
  phone: "617-806-6586",
  email: "team@bioechem.com",
} as const;

/** In-app portal navigation (same site). */
export const PORTAL_NAV = [
  { label: "Home", href: "/" },
] as const;

/** Links to the public marketing site (bioechem.com). */
export const MAIN_SITE_NAV = [
  {
    label: "Home of BioEchem",
    href: `${MAIN_SITE_URL}/`,
  },
  {
    label: "STEM programs",
    href: `${MAIN_SITE_URL}/stem-education`,
  },
  { label: "Curriculum", href: `${MAIN_SITE_URL}/about-3-1` },
  { label: "Contact us", href: `${MAIN_SITE_URL}/contact-us` },
] as const;

export const SOCIAL_LINKS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/bioechem-llc/",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/bioechem/",
  },
] as const;
