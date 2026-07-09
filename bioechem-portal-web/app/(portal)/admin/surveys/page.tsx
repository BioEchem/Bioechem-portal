import type { Metadata } from "next";
import Link from "next/link";

import { PortalCard, PortalPage } from "@/components/portal/portal-page";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Surveys" };

type SurveyRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  created_at: string;
  cohorts: { name: string } | null;
};

const TYPE_LABEL: Record<string, string> = {
  halfway: "Halfway",
  final: "Final",
  custom: "Custom",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

export default async function AdminSurveysPage() {
  const { supabase } = await requireSession({
    requireApproved: true,
    requiredRole: "bioechem_admin",
  });

  const { data } = await supabase
    .from("surveys")
    .select("id, title, type, status, created_at, cohorts(name)")
    .order("created_at", { ascending: false })
    .returns<SurveyRow[]>();

  const surveys = data ?? [];
  const active = surveys.filter((s) => s.status === "active");
  const draft = surveys.filter((s) => s.status === "draft");
  const closed = surveys.filter((s) => s.status === "closed");

  function SurveyTable({ rows }: { rows: SurveyRow[] }) {
    if (rows.length === 0) return <p className="text-sm text-bio-text-muted">None.</p>;
    return (
      <div className="divide-y divide-card-border">
        {rows.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-3 gap-3">
            <div className="min-w-0">
              <Link
                href={`/admin/surveys/${s.id}`}
                className="text-sm font-medium text-bio-text hover:text-bio-green truncate"
              >
                {s.title}
              </Link>
              <p className="text-xs text-bio-text-muted mt-0.5">
                {s.cohorts?.name ?? "—"} · {TYPE_LABEL[s.type] ?? s.type}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[s.status] ?? ""}`}
              >
                {s.status}
              </span>
              <Link
                href={`/admin/surveys/${s.id}/edit`}
                className="text-xs text-bio-text-muted hover:text-bio-green"
              >
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <PortalPage
      title="Surveys"
      description="Create and manage surveys sent to cohort participants."
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <Link
            href="/admin/surveys/new"
            className="rounded-lg bg-bio-green px-4 py-2 text-sm font-medium text-white hover:bg-bio-green/90"
          >
            + Create survey
          </Link>
        </div>

        {active.length > 0 && (
          <PortalCard>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">Active</h2>
              <span className="text-xs text-bio-text-muted">{active.length}</span>
            </div>
            <SurveyTable rows={active} />
          </PortalCard>
        )}

        {draft.length > 0 && (
          <PortalCard>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-text-muted">Draft</h2>
              <span className="text-xs text-bio-text-muted">{draft.length}</span>
            </div>
            <SurveyTable rows={draft} />
          </PortalCard>
        )}

        {closed.length > 0 && (
          <PortalCard>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-text-muted">Closed</h2>
              <span className="text-xs text-bio-text-muted">{closed.length}</span>
            </div>
            <SurveyTable rows={closed} />
          </PortalCard>
        )}

        {surveys.length === 0 && (
          <PortalCard>
            <p className="text-sm text-bio-text-muted">No surveys yet. Create one to get started.</p>
          </PortalCard>
        )}
      </div>
    </PortalPage>
  );
}
