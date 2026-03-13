import { getDashboardTenantContext } from "@/server/dashboard";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardMainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, currentMembership } =
    await getDashboardTenantContext();
  return (
    <DashboardShell
      session={session}
      currentMembership={currentMembership}
    >
      {children}
    </DashboardShell>
  );
}
