import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getCurrentSession } from "@/server/auth";
import { hasPermission, PERMISSION_SLUGS } from "@/server/rbac";
import { requestFromHeaders } from "@/server/request";
import { AdminShell } from "@/components/admin-shell";
import { getSidebarInsightsForAdmin } from "@/server/sidebar/insights";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | Admin | Vysen",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function CompanyAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const request = requestFromHeaders(await headers());
  const session = await getCurrentSession(request);
  if (!session) {
    redirect("/admin-login");
  }

  const canAccessAdmin = await hasPermission(
    session.user.id,
    null,
    PERMISSION_SLUGS.ADMIN_ACCESS
  );
  if (!canAccessAdmin) {
    redirect("/forbidden");
  }

  const insights = await getSidebarInsightsForAdmin({ periodDays: 30 });

  return (
    <AdminShell
      userEmail={session.user.email}
      userName={session.user.name}
      insights={insights}
      variant="admin"
      showVysen={false}
    >
      {children}
    </AdminShell>
  );
}
