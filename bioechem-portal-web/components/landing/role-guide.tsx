import Link from "next/link";
import { Building2, GraduationCap, Handshake, School, TrendingUp } from "lucide-react";
import { PUBLIC_FACING_ROLES, ROLE_DESCRIPTIONS } from "@/lib/auth/role-descriptions";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import type { SignupRole } from "@/lib/auth/types";

const ROLE_ICONS: Record<SignupRole, React.ComponentType<{ className?: string }>> = {
  participant: GraduationCap,
  teacher: School,
  school_admin: Building2,
  industry_partner: Handshake,
  shareholder: TrendingUp,
  bioechem_admin: Building2,
};

/** Homepage section that helps first-time visitors figure out which account type to sign up as. */
export function RoleGuide() {
  return (
    <section id="who-is-this-for" className="bg-bio-mint/20 px-4 py-14 sm:px-6 border-t border-card-border">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold text-bio-green">Who is this portal for?</h2>
          <Link href={AUTH_ROUTES.roles} className="text-sm font-medium text-bio-green hover:underline">
            See full details on each role →
          </Link>
        </div>
        <p className="mt-1 text-sm text-bio-text-muted">
          Not sure where to start? Pick the description that fits you and we&apos;ll take you straight to signup.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PUBLIC_FACING_ROLES.map((role) => {
            const Icon = ROLE_ICONS[role];
            const { label, blurb } = ROLE_DESCRIPTIONS[role];
            return (
              <Link
                key={role}
                href={`${AUTH_ROUTES.signup}?role=${role}`}
                className="flex flex-col gap-3 rounded-xl border border-card-border bg-white p-5 shadow-[var(--shadow-card)] transition-colors hover:border-bio-green"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bio-green/10">
                  <Icon className="h-5 w-5 text-bio-green" />
                </div>
                <div>
                  <p className="font-semibold text-bio-text">{label}</p>
                  <p className="mt-1 text-sm text-bio-text-muted leading-relaxed">{blurb}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
