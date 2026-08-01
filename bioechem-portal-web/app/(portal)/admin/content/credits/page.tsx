import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { CreditsContentEditor } from "@/components/admin/content/credits-content-editor";
import { requireSession } from "@/lib/auth/session";
import {
  DEFAULT_CREDITS_ACTIONS,
  DEFAULT_CREDITS_CLAIM,
  DEFAULT_CREDITS_INTRO,
  type CreditActionItem,
} from "@/lib/credits/default-content";

export const metadata: Metadata = { title: "Edit Credits Page" };

export default async function AdminCreditsContentPage() {
  const { supabase } = await requireSession({ requireApproved: true, requiredRole: "bioechem_admin" });

  const { data } = await supabase
    .from("credits_page_content")
    .select("intro_text, claim_text, actions")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ intro_text: string; claim_text: string; actions: CreditActionItem[] }>();

  return (
    <PortalPage
      title="Edit Credits Page"
      description="Changes here update what everyone sees on the Credits info page."
    >
      <div className="space-y-4">
        <Link
          href="/credits"
          className="flex items-center gap-1 text-sm text-bio-text-muted hover:text-bio-green"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Credits page
        </Link>

        <PortalCard>
          <CreditsContentEditor
            initialIntroText={data?.intro_text || DEFAULT_CREDITS_INTRO}
            initialClaimText={data?.claim_text || DEFAULT_CREDITS_CLAIM}
            initialActions={data?.actions && data.actions.length > 0 ? data.actions : DEFAULT_CREDITS_ACTIONS}
          />
        </PortalCard>
      </div>
    </PortalPage>
  );
}
