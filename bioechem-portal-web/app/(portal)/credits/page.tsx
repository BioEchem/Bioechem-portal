import type { Metadata } from "next";
import Link from "next/link";
import { Gift, Mail, Settings } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { requireSession } from "@/lib/auth/session";
import {
  DEFAULT_CREDITS_ACTIONS,
  DEFAULT_CREDITS_CLAIM,
  DEFAULT_CREDITS_INTRO,
  type CreditActionItem,
} from "@/lib/credits/default-content";
import { formatShortDate as fmt } from "@/lib/format/date";

export const metadata: Metadata = { title: "Credits" };

type ActionItem = CreditActionItem;

export default async function CreditsInfoPage() {
  const { supabase, user, profile } = await requireSession({ requireApproved: true });
  const isAdmin = profile.role === "bioechem_admin";

  const [{ data }, { data: creditNote }] = await Promise.all([
    supabase
      .from("credits_page_content")
      .select("intro_text, claim_text, actions")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<{ intro_text: string; claim_text: string; actions: ActionItem[] }>(),
    supabase
      .from("user_credit_notes")
      .select("note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ note: string | null; created_at: string }>(),
  ]);

  const introText = data?.intro_text || DEFAULT_CREDITS_INTRO;
  const claimText = data?.claim_text || DEFAULT_CREDITS_CLAIM;
  const actions = data?.actions && data.actions.length > 0 ? data.actions : DEFAULT_CREDITS_ACTIONS;

  return (
    <PortalPage
      title="Credits"
      description="Earn credits for staying engaged on the portal redeemable later for reimbursement or BioEchem merchandise."
    >
      <div className="space-y-4">
        {isAdmin && (
          <div className="flex flex-wrap gap-4">
            <Link
              href="/admin/content/credits"
              className="flex items-center gap-1.5 text-sm font-medium text-bio-green hover:underline"
            >
              <Settings className="h-4 w-4" /> Edit this page
            </Link>
            <Link
              href="/admin/credits"
              className="flex items-center gap-1.5 text-sm font-medium text-bio-green hover:underline"
            >
              <Settings className="h-4 w-4" /> Manage user credits
            </Link>
          </div>
        )}

        <PortalCard>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">Your credits</h2>
          {creditNote?.note ? (
            <>
              <p className="mt-2 whitespace-pre-wrap text-sm text-bio-text">{creditNote.note}</p>
              <p className="mt-2 text-xs text-bio-text-muted">Last updated {fmt(creditNote.created_at)}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-bio-text-muted">
              No credits have been recorded for you yet.
            </p>
          )}
        </PortalCard>

        <PortalCard>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">How it works</h2>
          <p className="mt-2 text-sm text-bio-text-muted leading-relaxed whitespace-pre-wrap">{introText}</p>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>This program is currently tracked manually.</strong> Credits aren&apos;t automatically
            added to your account yet. Please see &quot;How to claim your credits&quot; below.
          </p>
        </PortalCard>

        <PortalCard>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">Ways to earn credits</h2>
          <div className="mt-3 space-y-3">
            {actions.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-card-border px-4 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bio-green/10">
                  <Gift className="h-4 w-4 text-bio-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-bio-text">{item.action}</p>
                    <span className="shrink-0 rounded-full bg-bio-mint/40 px-2.5 py-0.5 text-xs font-semibold text-bio-green">
                      {item.credits}
                    </span>
                  </div>
                  {item.note ? (
                    <p className="mt-0.5 text-xs text-bio-text-muted">{item.note}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-bio-text-muted">
            Exact credit values and eligible actions may change — this list is a general guide, not a guarantee.
          </p>
        </PortalCard>

        <PortalCard>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">How to claim your credits</h2>
          <p className="mt-2 text-sm text-bio-text-muted leading-relaxed whitespace-pre-wrap">{claimText}</p>
          <a
            href="mailto:team@bioechem.com?subject=Credits%20claim"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90"
          >
            <Mail className="h-4 w-4" />
            Email team@bioechem.com to claim credits
          </a>
        </PortalCard>
      </div>
    </PortalPage>
  );
}
