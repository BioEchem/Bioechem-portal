import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  await requireSession({ requireApproved: true, requiredRole: "bioechem_admin" });

  return (
    <PortalPage
      title="Analytics"
      description="Platform-wide metrics and per-cohort performance data."
    >
      <AnalyticsDashboard />
    </PortalPage>
  );
}
