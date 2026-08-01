import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

import { MAIN_SITE_URL } from "@/lib/brand/site";

import { PortalCard } from "@/components/portal/portal-page";
import type { DashboardProfileField } from "@/lib/dashboard/types";
import { PORTAL_ROUTES } from "@/lib/portal/routes";

export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-card-border bg-bio-white p-4">
      <p className="text-xs uppercase tracking-wide text-bio-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-bio-green">{value}</p>
    </div>
  );
}

export function DashboardTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: ReactNode[][];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-bio-text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-card-border text-bio-text-muted">
            {headers.map((header) => (
              <th key={header} className="py-2 pr-4 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-card-border/70">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-2 pr-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type DashboardProfileCardProps = {
  title?: string;
  fields: DashboardProfileField[];
  /** Hides the "Edit profile" link — it would edit the viewer's own account, not the previewed user's, so it's suppressed during admin "view as" preview. */
  hideEditLink?: boolean;
};

export function DashboardProfileCard({
  title = "Your information",
  fields,
  hideEditLink = false,
}: DashboardProfileCardProps) {
  return (
    <PortalCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
            {title}
          </h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label}>
                <dt className="text-bio-text-muted">{field.label}</dt>
                <dd className="font-medium text-bio-text">{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {hideEditLink ? null : (
          <Link
            href={PORTAL_ROUTES.account}
            className="bio-btn-secondary inline-flex shrink-0"
          >
            Edit profile
          </Link>
        )}
      </div>
    </PortalCard>
  );
}

export function DashboardWelcomeCard({
  name,
  subtitle,
}: {
  name: string;
  subtitle: string;
}) {
  return (
    <PortalCard>
      <h2 className="text-lg font-semibold text-bio-green">Welcome back, {name}</h2>
      <p className="mt-2 text-sm text-bio-text-muted">{subtitle}</p>
      <div className="mt-4 border-t border-card-border pt-4">
        <a
          href={MAIN_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-bio-green/8 border border-bio-green/20 px-4 py-2.5 text-sm font-medium text-bio-green transition-colors hover:bg-bio-green/15"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          Visit bioechem.com — learn more about our programs
        </a>
      </div>
    </PortalCard>
  );
}

export type DashboardQuickLink = {
  label: string;
  href: string;
  description: string;
};

export function DashboardQuickLinks({ links }: { links: DashboardQuickLink[] }) {
  return (
    <PortalCard>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
        Quick links
      </h2>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded-lg border border-card-border bg-bio-white px-4 py-3 transition-colors hover:border-bio-green/40"
            >
              <span className="font-medium text-bio-green">{link.label}</span>
              <p className="mt-1 text-sm text-bio-text-muted">{link.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </PortalCard>
  );
}

export function DashboardPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <PortalCard>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
        {title}
      </h2>
      <p className="mt-3 text-sm text-bio-text-muted">{description}</p>
    </PortalCard>
  );
}

export function DashboardPlaceholderGrid({
  items,
}: {
  items: { title: string; description: string }[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {items.map((item) => (
        <DashboardPlaceholder
          key={item.title}
          title={item.title}
          description={item.description}
        />
      ))}
    </div>
  );
}

type DashboardShellProps = {
  user: { displayName: string };
  subtitle: string;
  profileFields: DashboardProfileField[];
  children: ReactNode;
  /** Set when a bioechem_admin is previewing this dashboard as another user — suppresses the "Edit profile" link. */
  isBioAdminViewing?: boolean;
};

/** Shared welcome + profile header used by role dashboards. */
export function DashboardShell({
  user,
  subtitle,
  profileFields,
  children,
  isBioAdminViewing = false,
}: DashboardShellProps) {
  return (
    <div className="space-y-4">
      <DashboardWelcomeCard name={user.displayName} subtitle={subtitle} />
      <DashboardProfileCard fields={profileFields} hideEditLink={isBioAdminViewing} />
      {children}
    </div>
  );
}
