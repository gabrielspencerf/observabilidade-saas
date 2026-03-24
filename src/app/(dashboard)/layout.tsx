import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentSession } from "@/server/auth";
import { getMembershipsForUser } from "@/server/tenancy/membership";
import { hasPermission, PERMISSION_SLUGS } from "@/server/rbac";
import { requestFromHeaders } from "@/server/request";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | Dashboard | Vysen",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const request = requestFromHeaders(await headers());
  const session = await getCurrentSession(request);
  if (!session) {
    redirect("/login?from=/dashboard");
  }
  const memberships = await getMembershipsForUser(session.user.id);
  if (memberships.length === 0) {
    redirect("/forbidden");
  }
  const currentTenantId = session.session.currentTenantId;
  if (currentTenantId) {
    const canAccessDashboard = await hasPermission(
      session.user.id,
      currentTenantId,
      PERMISSION_SLUGS.DASHBOARD_READ
    );
    if (!canAccessDashboard) {
      redirect("/forbidden");
    }
  }
  return <>{children}</>;
}
