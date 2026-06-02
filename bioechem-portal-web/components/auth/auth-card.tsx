import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Centered card shell for login, signup, and other auth pages. */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-md rounded-xl border border-card-border bg-card p-8 shadow-[var(--shadow-card)]">
      <h1 className="text-center text-2xl font-semibold text-bio-green">{title}</h1>
      {description ? (
        <p className="mt-2 text-center text-sm text-bio-text-muted">{description}</p>
      ) : null}
      <div className="mt-6">{children}</div>
      {footer ? (
        <div className="mt-6 border-t border-card-border pt-6 text-center text-sm text-bio-text-muted">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
