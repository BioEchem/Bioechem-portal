import type { Metadata } from "next";
import { Building2, Globe, Mail, MapPin, Phone, User } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My School" };

type SchoolRow = {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  website: string | null;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

export default async function MySchoolPage() {
  const { supabase, profile } = await requireSession({
    requireApproved: true,
    profileSelect: "role, school_id",
  });

  const canView = profile.role === "participant" || profile.role === "teacher" || profile.role === "school_admin";
  const schoolId = (profile as { school_id: string | null }).school_id;

  if (!canView || !schoolId) {
    return (
      <PortalPage title="My School">
        <PortalCard>
          <p className="text-sm text-bio-text-muted">
            {canView ? "You're not currently linked to a partner school." : "This page isn't available for your role."}
          </p>
        </PortalCard>
      </PortalPage>
    );
  }

  const { data: school } = await supabase
    .from("schools")
    .select("id, name, description, city, state, country, website, contact_name, contact_title, contact_email, contact_phone")
    .eq("id", schoolId)
    .maybeSingle<SchoolRow>();

  if (!school) {
    return (
      <PortalPage title="My School">
        <PortalCard>
          <p className="text-sm text-bio-text-muted">School information isn&apos;t available right now.</p>
        </PortalCard>
      </PortalPage>
    );
  }

  const location = [school.city, school.state, school.country].filter(Boolean).join(", ");
  const hasContact = school.contact_name || school.contact_email || school.contact_phone;

  return (
    <PortalPage title={school.name} description="Your partner school">
      <div className="space-y-4">
        <PortalCard>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-bio-green/10">
              <Building2 className="h-6 w-6 text-bio-green" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-bio-text">{school.name}</h2>
              {school.description ? (
                <p className="mt-1 text-sm text-bio-text-muted">{school.description}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-bio-text-muted">
                {location ? (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {location}
                  </span>
                ) : null}
                {school.website ? (
                  <a
                    href={school.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-bio-green"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {school.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </PortalCard>

        <PortalCard>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">School contact</h2>
          {!hasContact ? (
            <p className="mt-2 text-sm text-bio-text-muted">No contact information has been added yet.</p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              {school.contact_name ? (
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-bio-text-muted" />
                  <span className="text-bio-text">
                    {school.contact_name}
                    {school.contact_title ? (
                      <span className="text-bio-text-muted"> · {school.contact_title}</span>
                    ) : null}
                  </span>
                </div>
              ) : null}
              {school.contact_email ? (
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-bio-text-muted" />
                  <a href={`mailto:${school.contact_email}`} className="text-bio-green hover:underline">
                    {school.contact_email}
                  </a>
                </div>
              ) : null}
              {school.contact_phone ? (
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-bio-text-muted" />
                  <a href={`tel:${school.contact_phone}`} className="text-bio-green hover:underline">
                    {school.contact_phone}
                  </a>
                </div>
              ) : null}
            </dl>
          )}
        </PortalCard>
      </div>
    </PortalPage>
  );
}
