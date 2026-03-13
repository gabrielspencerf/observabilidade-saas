import Link from "next/link";
import {
  getDashboardTenantContext,
  getFunnelOverviewForTenant,
} from "@/server/dashboard";
import { PageSection } from "@/components/layout";

const PERIOD_OPTIONS = [
  { value: "", label: "Todos os leads" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
] as const;

function formatNumber(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function formatPercent(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(n) + "%";
}

export default async function DashboardFunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { tenantId } = await getDashboardTenantContext();
  const params = await searchParams;
  const periodParam = params.period ?? "";
  const periodDays =
    periodParam === ""
      ? undefined
      : PERIOD_OPTIONS.some((p) => p.value === periodParam)
        ? parseInt(periodParam, 10)
        : undefined;

  const overview = await getFunnelOverviewForTenant(tenantId, {
    periodDays,
  });

  return (
    <PageSection>
      <h1 className="text-xl font-semibold text-neutral-900">Funil</h1>
      <p className="mt-2 text-neutral-600">
        Volume por etapa, conversão e progressão. Destaque para o possível
        gargalo entre etapas.
      </p>

      {/* Filtro de período: leads com first_seen_at no período */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-neutral-600">Período (primeiro contato):</span>
        <nav className="flex flex-wrap gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <Link
              key={opt.value || "all"}
              href={
                opt.value === ""
                  ? "/dashboard/funnel"
                  : `/dashboard/funnel?period=${opt.value}`
              }
              className={`rounded px-2 py-1 ${
                (periodParam || "") === opt.value
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </nav>
        {periodDays != null && (
          <span className="text-neutral-500">
            (leads com primeiro contato nos últimos {periodDays} dias)
          </span>
        )}
      </div>

      {overview.length === 0 ? (
        <div className="mt-6 rounded border border-neutral-200 bg-white p-6 text-center text-neutral-600">
          Nenhum funil configurado para este tenant. Crie funis e etapas para
          visualizar a progressão dos leads.
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {overview.map((row) => (
            <section
              key={row.funnelId}
              className="rounded border border-neutral-200 bg-white p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-medium text-neutral-900">
                  {row.funnelName}
                  {!row.isActive && (
                    <span className="ml-2 text-sm font-normal text-neutral-500">
                      (inativo)
                    </span>
                  )}
                </h2>
                <span className="text-sm text-neutral-500">
                  Total: {formatNumber(row.totalLeads)} leads
                </span>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                {row.steps.map((step, idx) => {
                  const isBottleneck =
                    row.bottleneckFromStepIndex !== null &&
                    idx === row.bottleneckFromStepIndex + 1;
                  return (
                    <div
                      key={step.stepId}
                      className={`flex min-w-[7rem] flex-col rounded border px-3 py-2 ${
                        isBottleneck
                          ? "border-amber-500 bg-amber-50 shadow-sm ring-1 ring-amber-200"
                          : "border-neutral-200 bg-neutral-50"
                      }`}
                    >
                      {isBottleneck && (
                        <span className="mb-0.5 text-xs font-medium text-amber-700">
                          Possível gargalo
                        </span>
                      )}
                      <span className="text-xs font-medium text-neutral-600">
                        {step.stepName}
                      </span>
                      <span className="text-lg font-semibold text-neutral-900">
                        {formatNumber(step.leadCount)}
                      </span>
                      {step.conversionFromPrevious != null && (
                        <span className="text-xs text-neutral-600">
                          {formatPercent(step.conversionFromPrevious)} da anterior
                        </span>
                      )}
                      {row.totalLeads > 0 && (
                        <span className="text-xs text-neutral-500">
                          {formatPercent(step.percentOfTotal)} do total
                        </span>
                      )}
                    </div>
                  );
                })}
                {row.unassignedCount > 0 && (
                  <div className="flex min-w-[7rem] flex-col rounded border border-amber-200 bg-amber-50 px-3 py-2">
                    <span className="text-xs font-medium text-amber-800">
                      Sem etapa
                    </span>
                    <span className="text-lg font-semibold text-amber-900">
                      {formatNumber(row.unassignedCount)}
                    </span>
                    {row.totalLeads > 0 && (
                      <span className="text-xs text-amber-700">
                        {formatPercent(row.unassignedPercentOfTotal)} do total
                      </span>
                    )}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link
          href="/dashboard/leads"
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          ← Voltar para Leads
        </Link>
      </div>
    </PageSection>
  );
}
