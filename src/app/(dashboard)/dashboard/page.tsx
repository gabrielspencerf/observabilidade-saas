import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth";
import { getCurrentMembership } from "@/server/tenancy/membership";
import { requestFromHeaders } from "@/server/request";
import { headers } from "next/headers";

/**
 * /dashboard — redireciona para seleção de tenant ou para a área principal.
 */
export default async function DashboardEntryPage() {
  const request = requestFromHeaders(await headers());
  const session = await getCurrentSession(request);
  if (!session) redirect("/login?from=/dashboard");

  const currentMembership = session.session.currentTenantId
    ? await getCurrentMembership(
        session.user.id,
        session.session.currentTenantId
      )
    : null;

  if (!currentMembership) {
    redirect("/dashboard/context");
  }
  redirect("/dashboard/home");
}
