import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth";
import { hasPermission } from "@/server/rbac";
import { PERMISSION_SLUGS } from "@/server/rbac";
import { requestFromHeaders } from "@/server/request";
import { headers } from "next/headers";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminLayout({
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
  return (
    <AdminShell userEmail={session.user.email}>{children}</AdminShell>
  );
}
