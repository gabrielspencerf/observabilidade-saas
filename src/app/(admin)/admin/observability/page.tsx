import { redirect } from "next/navigation";

export default function LegacyAdminObservabilityRedirect() {
  redirect("/superadmin/observability");
}
