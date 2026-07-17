import type { Metadata } from "next";
import Link from "next/link";
import { Check, Building2, GraduationCap, Handshake, School, ShieldCheck, TrendingUp } from "lucide-react";

import { SiteFooter } from "@/components/brand/site-footer";
import { SiteHeader } from "@/components/brand/site-header";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { PUBLIC_FACING_ROLES, ROLE_DESCRIPTIONS } from "@/lib/auth/role-descriptions";
import type { SignupRole } from "@/lib/auth/types";

export const metadata: Metadata = {
  title: "Account types",
  description: "A guide to every account type on the BioEchem portal, and who each one is for.",
};

const ROLE_ICONS: Record<SignupRole, React.ComponentType<{ className?: string }>> = {
  participant: GraduationCap,
  teacher: School,
  school_admin: Building2,
  industry_partner: Handshake,
  shareholder: TrendingUp,
  bioechem_admin: ShieldCheck,
};

export default function RolesPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <section className="bio-gradient-header px-4 py-16 text-white sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-bio-green-muted">
              New here?
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
              Which account type is right for you?
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-white/85">
              The BioEchem portal has a few different account types, each built for a different
              part of our community. Find yourself below, then sign up with that role.
            </p>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {PUBLIC_FACING_ROLES.map((role) => {
              const Icon = ROLE_ICONS[role];
              const { label, audience, blurb, features } = ROLE_DESCRIPTIONS[role];
              return (
                <div
                  key={role}
                  id={role}
                  className="flex flex-col gap-5 rounded-xl border border-card-border bg-card p-6 shadow-[var(--shadow-card)] sm:flex-row sm:p-8"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-bio-green/10">
                    <Icon className="h-6 w-6 text-bio-green" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-bio-text">{label}</h2>
                    <p className="mt-0.5 text-sm text-bio-text-muted">{audience}</p>
                    <p className="mt-3 text-sm leading-relaxed text-bio-text">{blurb}</p>

                    <ul className="mt-4 space-y-1.5">
                      {features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-bio-text-muted">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-bio-green" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={`${AUTH_ROUTES.signup}?role=${role}`}
                      className="mt-5 inline-flex items-center rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90"
                    >
                      Sign up as a {label.toLowerCase()} →
                    </Link>
                  </div>
                </div>
              );
            })}

            <div className="rounded-xl border border-dashed border-card-border p-6 text-center">
              <p className="text-sm text-bio-text-muted">
                Not sure which one fits, or need something not listed here (like internal BioEchem staff access)?{" "}
                <a href="mailto:team@bioechem.com" className="font-medium text-bio-green hover:underline">
                  Email us
                </a>{" "}
                and we&apos;ll point you in the right direction.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
