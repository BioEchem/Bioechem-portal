import Link from "next/link";

import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { MAIN_SITE_URL } from "@/lib/brand/site";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedInDestination = user
    ? await resolvePostLoginRedirect(supabase, user.id)
    : null;

  return (
    <main className="bio-pattern flex flex-1 flex-col">
      <section className="bio-gradient-header relative px-4 py-16 text-white sm:px-6 sm:py-20">
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-bio-green-muted">
            Clean Tech · STEM Education
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            BioEchem Partner School Portal
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/90">
            Sign in for curriculum, resources, and classroom tools — the same
            mission as{" "}
            <a
              href={MAIN_SITE_URL}
              className="font-medium underline decoration-bio-green-muted/60 underline-offset-2 hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              bioechem.com
            </a>
            , built for participants, teachers, and partner schools.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {user && signedInDestination ? (
              <Link href={signedInDestination} className="bio-btn-primary">
                Go to portal
              </Link>
            ) : (
              <>
                <Link href={AUTH_ROUTES.signup} className="bio-btn-primary">
                  Create account
                </Link>
                <Link
                  href={AUTH_ROUTES.login}
                  className="inline-flex h-11 items-center justify-center rounded-lg border-2 border-white px-6 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-card-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-bio-green">Who is this for?</h2>
          <p className="mt-2 text-sm text-bio-text-muted">
            Participants and teachers at BioEchem partner schools. After signup, an
            admin approves your account before you can access the full portal.
          </p>
          <p className="mt-4 text-sm text-bio-text-muted">
            Learn more about programs on the{" "}
            <a
              href={`${MAIN_SITE_URL}/stem-education`}
              className="font-medium text-bio-green hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              main website
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
