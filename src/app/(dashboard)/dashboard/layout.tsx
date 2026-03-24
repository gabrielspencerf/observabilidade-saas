import { getDashboardTenantContext } from "@/server/dashboard";
import { DashboardShell } from "@/components/dashboard-shell";
import { getSidebarInsightsForTenant } from "@/server/sidebar/insights";

export default async function DashboardMainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, tenantId } =
    await getDashboardTenantContext();
  const insights = await getSidebarInsightsForTenant(tenantId, { periodDays: 30 });
  return (
    <DashboardShell
      tenantId={tenantId}
      userEmail={session.user.email}
      userName={session.user.name}
      insights={insights}
    >
      {children}
    </DashboardShell>
  );
}
