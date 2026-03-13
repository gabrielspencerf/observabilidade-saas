import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth";
import { getMembershipsForUser } from "@/server/tenancy/membership";
import { requestFromHeaders } from "@/server/request";
import { headers } from "next/headers";

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
  return <>{children}</>;
}
