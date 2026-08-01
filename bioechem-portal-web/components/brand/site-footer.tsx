import Link from "next/link";

import {
  MAIN_SITE_CONTACT,
  MAIN_SITE_URL,
  SOCIAL_LINKS,
} from "@/lib/brand/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-card-border bg-bio-footer text-bio-text-muted">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-bio-green">
            Address
          </p>
          <p className="mt-2 text-sm">{MAIN_SITE_CONTACT.address}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-bio-green">
            Get in touch
          </p>
          <p className="mt-2 text-sm">
            <a
              href={`tel:${MAIN_SITE_CONTACT.phone.replace(/-/g, "")}`}
              className="hover:text-bio-green"
            >
              Tel: {MAIN_SITE_CONTACT.phone}
            </a>
          </p>
          <p className="mt-1 text-sm">
            <a
              href={`mailto:${MAIN_SITE_CONTACT.email}`}
              className="hover:text-bio-green"
            >
              {MAIN_SITE_CONTACT.email}
            </a>
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-bio-green">
            Follow
          </p>
          <ul className="mt-2 flex flex-wrap gap-4 text-sm">
            {SOCIAL_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="hover:text-bio-green"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-card-border/80 px-4 py-4 text-center text-xs sm:px-6">
        <Link
          href={MAIN_SITE_URL}
          className="font-medium text-bio-green hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          bioechem.com
        </Link>
        <span className="text-bio-text-muted"> · Partner-school portal</span>
      </div>
    </footer>
  );
}
