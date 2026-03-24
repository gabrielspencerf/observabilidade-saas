import {
  getDashboardTenantContext,
  listOnboardingStepsWithProgress,
} from "@/server/dashboard";
import { PageSection } from "@/components/layout";
import { DashboardPageHeader } from "@/components/layout";
import { OnboardingProgress } from "./onboarding-progress";
import { Rocket } from "lucide-react";

export default async function OnboardingPage() {
  const { tenantId } = await getDashboardTenantContext();
  const steps = await listOnboardingStepsWithProgress(tenantId);
  const completed = steps.filter((s) => s.completedAt !== null).length;
  const total = steps.length;

  return (
    <PageSection variant="plain" className="px-1 py-0 sm:px-2 md:px-2 md:pt-0 md:pb-0">
      <DashboardPageHeader
        title="Onboarding"
        description="Conclua as etapas para configurar sua conta."
        icon={Rocket}
        badges={[`${completed} de ${total} etapas`]}
      />
      <div className="mb-6 h-2 w-full max-w-md overflow-hidden rounded-full bg-brand-text/10">
        <div
          className="h-full rounded-full bg-brand-neon transition-all"
          style={{ width: total ? `${(completed / total) * 100}%` : "0%" }}
        />
      </div>
      <OnboardingProgress steps={steps} />
    </PageSection>
  );
}
