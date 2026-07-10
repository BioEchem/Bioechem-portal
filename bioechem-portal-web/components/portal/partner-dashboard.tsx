import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

import {
  DashboardQuickLinks,
  DashboardShell,
} from "@/components/portal/dashboard-ui";
import { PortalCard } from "@/components/portal/portal-page";
import type { PartnerDashboardData } from "@/lib/dashboard/partner-data";
import {
  buildDashboardProfileFields,
  type DashboardUserContext,
} from "@/lib/dashboard/types";
import { PORTAL_ROUTES } from "@/lib/portal/routes";
import { getRoleConfig } from "@/lib/portal/role-config";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  upcoming: "Upcoming",
  completed: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-bio-green/10 text-bio-green",
  upcoming: "bg-blue-50 text-blue-700",
  completed: "bg-gray-100 text-gray-600",
};

type PartnerDashboardProps = {
  user: DashboardUserContext;
  data: PartnerDashboardData;
};

export function PartnerDashboard({ user, data }: PartnerDashboardProps) {
  const { welcomeSubtitle } = getRoleConfig(user.role);
  const { schools, programs, upcomingEvents, recentDocuments } = data;

  return (
    <DashboardShell
      user={user}
      subtitle={welcomeSubtitle}
      profileFields={buildDashboardProfileFields(user)}
    >
      <DashboardQuickLinks
        links={[
          {
            label: "Messaging",
            href: PORTAL_ROUTES.messaging,
            description: "Connect with BioEchem staff and partner schools.",
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Partnership programs ── */}
        <PortalCard>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
            Partnership programs
          </h2>
          {programs.length === 0 ? (
            <p className="mt-3 text-sm text-bio-text-muted">
              Active BioEchem partnership opportunities and your involvement will be listed here.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {programs.map((program) => (
                <li key={program.id} className="border-b border-card-border/70 pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-bio-text">{program.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[program.status] ?? STATUS_COLORS.active}`}>
                      {STATUS_LABELS[program.status] ?? program.status}
                    </span>
                  </div>
                  {program.description ? (
                    <p className="mt-1 text-sm text-bio-text-muted">{program.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </PortalCard>

        {/* ── Collaborating schools ── */}
        <PortalCard>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
            Collaborating schools
          </h2>
          {schools.length === 0 ? (
            <p className="mt-3 text-sm text-bio-text-muted">
              Partner schools and cohorts you support will appear here.
            </p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {schools.map((school) => (
                <li
                  key={school.id}
                  className="rounded-full border border-card-border bg-bio-surface px-3 py-1 text-sm text-bio-text"
                >
                  {school.name}
                </li>
              ))}
            </ul>
          )}
        </PortalCard>

        {/* ── Events & outreach ── */}
        <PortalCard>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
              Events &amp; outreach
            </h2>
            <Link href={PORTAL_ROUTES.partnerEvents} className="shrink-0 text-xs font-medium text-bio-green hover:underline">
              View all
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="mt-3 text-sm text-bio-text-muted">
              Upcoming workshops, demos, and student engagement events will show here.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {upcomingEvents.map((event) => (
                <li key={event.id} className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-bio-green" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-bio-text">{event.title}</p>
                    <p className="text-xs text-bio-text-muted">
                      {event.eventDate ?? "Date to be announced"}
                      {event.location ? (
                        <span className="ml-1 inline-flex items-center gap-1">
                          <MapPin className="inline h-3 w-3" /> {event.location}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PortalCard>

        {/* ── Impact reports ── */}
        <PortalCard>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
              Impact reports
            </h2>
            <Link href={PORTAL_ROUTES.partnerDocs} className="shrink-0 text-xs font-medium text-bio-green hover:underline">
              View all
            </Link>
          </div>
          {recentDocuments.length === 0 ? (
            <p className="mt-3 text-sm text-bio-text-muted">
              Program outcomes and collaboration metrics will be available here.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentDocuments.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-bio-text">{doc.title}</span>
                  <span className="shrink-0 text-xs text-bio-text-muted">{doc.createdAt}</span>
                </li>
              ))}
            </ul>
          )}
        </PortalCard>
      </div>
    </DashboardShell>
  );
}
