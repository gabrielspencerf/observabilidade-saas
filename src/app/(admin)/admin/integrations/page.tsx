import { redirect } from "next/navigation";

export default function LegacyAdminIntegrationsRedirect() {
  redirect("/superadmin/integrations");
}
