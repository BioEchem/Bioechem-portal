import { PortalCard, PortalPage } from "@/components/portal/portal-page";

export default function SurveyDetailLoading() {
  return (
    <PortalPage title="Survey">
      <div className="space-y-4">
        <PortalCard>
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-48 rounded bg-bio-mint/60" />
            <div className="h-4 w-72 rounded bg-bio-mint/40" />
            <div className="h-4 w-32 rounded bg-bio-mint/40" />
          </div>
        </PortalCard>
        <PortalCard>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-full rounded bg-bio-mint/40" />
            ))}
          </div>
        </PortalCard>
      </div>
    </PortalPage>
  );
}
