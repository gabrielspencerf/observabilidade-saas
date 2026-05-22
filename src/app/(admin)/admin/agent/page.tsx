import { redirect } from "next/navigation";

export default function LegacyAdminAgentPage() {
  redirect("/superadmin/agent");
}
