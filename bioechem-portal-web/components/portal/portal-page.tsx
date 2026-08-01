type PortalPageProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function PortalPage({ title, description, children }: PortalPageProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-bio-mint/30 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-bio-green">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-bio-text-muted">{description}</p>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  );
}

type PortalCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function PortalCard({ children, className = "" }: PortalCardProps) {
  return (
    <div
      className={`rounded-xl border border-card-border bg-card p-6 shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </div>
  );
}

type ComingSoonProps = {
  feature: string;
};

export function PortalComingSoon({ feature }: ComingSoonProps) {
  return (
    <PortalCard>
      <p className="text-sm text-bio-text-muted">
        <span className="font-medium text-bio-text">{feature}</span> will be
        available here soon
      </p>
    </PortalCard>
  );
}
