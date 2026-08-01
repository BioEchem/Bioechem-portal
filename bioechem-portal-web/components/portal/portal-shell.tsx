import { PortalSidebar } from "@/components/portal/portal-sidebar";

type PortalShellProps = {
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  children: React.ReactNode;
};

export function PortalShell({
  userName,
  userEmail,
  userRole,
  children,
}: PortalShellProps) {
  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <PortalSidebar
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
      />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
