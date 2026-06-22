import { PortalCard } from "@/components/portal/portal-page";

type ProfileSectionProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function ProfileSection({
  title,
  description,
  action,
  children,
  className = "",
}: ProfileSectionProps) {
  return (
    <PortalCard className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-bio-green">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-bio-text-muted">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </PortalCard>
  );
}

type ProfileEditButtonProps = {
  onClick: () => void;
  label?: string;
};

export function ProfileEditButton({
  onClick,
  label = "Edit",
}: ProfileEditButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-medium text-bio-green hover:underline"
    >
      {label}
    </button>
  );
}
