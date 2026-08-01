import Link from "next/link";

import {
  DashboardQuickLinks,
  DashboardShell,
  StatCard,
} from "@/components/portal/dashboard-ui";
import { PortalCard } from "@/components/portal/portal-page";
import type { ShareholderDashboardData } from "@/lib/dashboard/shareholder-data";
import {
  buildDashboardProfileFields,
  type DashboardUserContext,
} from "@/lib/dashboard/types";
import { PORTAL_ROUTES } from "@/lib/portal/routes";
import { getRoleConfig } from "@/lib/portal/role-config";

const CATEGORY_LABELS: Record<string, string> = {
  financial: "Financial",
  report: "Reports",
  governance: "Governance",
  meeting: "Meeting materials",
  general: "General",
};

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? "Other";
}

type ShareholderDashboardProps = {
  user: DashboardUserContext;
  data: ShareholderDashboardData;
  asUserId?: string;
};

export function ShareholderDashboard({ user, data, asUserId }: ShareholderDashboardProps) {
  const { welcomeSubtitle } = getRoleConfig(user.role);
  const { updates, recentDocuments, governanceDocuments, documentCountsByCategory, impact } = data;

  return (
    <DashboardShell
      user={user}
      subtitle={welcomeSubtitle}
      profileFields={buildDashboardProfileFields(user)}
      isBioAdminViewing={!!asUserId}
    >
      {/* ── Program impact ── */}
      <PortalCard>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
          Program impact
        </h2>
        <p className="mt-1 text-sm text-bio-text-muted">
          High-level reach of BioEchem&apos;s programs across partner schools.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Partner schools" value={impact.partnerSchools} />
          <StatCard label="Active cohorts" value={impact.activeCohorts} />
          <StatCard label="Enrolled students" value={impact.enrolledStudents} />
          <StatCard label="Teachers" value={impact.teachers} />
        </div>
      </PortalCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Company updates ── */}
        <PortalCard>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
            Company updates
          </h2>
          {updates.length === 0 ? (
            <p className="mt-3 text-sm text-bio-text-muted">
              No updates published yet. Check back soon for news and milestones from BioEchem.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {updates.map((update) => (
                <li key={update.id} className="border-b border-card-border/70 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-bio-text">{update.title}</p>
                  <p className="text-xs text-bio-text-muted">{update.date}</p>
                  {update.excerpt ? (
                    <p className="mt-1 text-sm text-bio-text-muted">{update.excerpt}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </PortalCard>

        {/* ── Reports & documents ── */}
        <PortalCard>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
              Reports &amp; documents
            </h2>
            <Link href={PORTAL_ROUTES.shareholderDocs} className="shrink-0 text-xs font-medium text-bio-green hover:underline">
              View all
            </Link>
          </div>
          {recentDocuments.length === 0 ? (
            <p className="mt-3 text-sm text-bio-text-muted">
              Financial reports, board materials, and shareholder documents will be shared here.
            </p>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {recentDocuments.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-bio-text">{doc.title}</span>
                    <span className="shrink-0 text-xs text-bio-text-muted">{doc.createdAt}</span>
                  </li>
                ))}
              </ul>
              {Object.keys(documentCountsByCategory).length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-card-border pt-3">
                  {Object.entries(documentCountsByCategory).map(([category, count]) => (
                    <span
                      key={category}
                      className="rounded-full border border-card-border bg-bio-surface px-2.5 py-1 text-xs text-bio-text-muted"
                    >
                      {categoryLabel(category)}: {count}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </PortalCard>

        {/* ── Meetings & governance ── */}
        <PortalCard>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
              Meetings &amp; governance
            </h2>
            <Link href={PORTAL_ROUTES.shareholderDocs} className="shrink-0 text-xs font-medium text-bio-green hover:underline">
              View all
            </Link>
          </div>
          {governanceDocuments.length === 0 ? (
            <p className="mt-3 text-sm text-bio-text-muted">
              Shareholder meeting schedules, minutes, and governance materials will be listed here.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {governanceDocuments.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-bio-text">{doc.title}</span>
                  <span className="shrink-0 text-xs text-bio-text-muted">{doc.createdAt}</span>
                </li>
              ))}
            </ul>
          )}
        </PortalCard>

        {/* ── Contact ── */}
        <DashboardQuickLinks
          links={[
            {
              label: "Message BioEchem Admin",
              href: PORTAL_ROUTES.messaging,
              description: "Questions about a report or an upcoming meeting? Send a message directly.",
            },
          ]}
        />
      </div>
    </DashboardShell>
  );
}
