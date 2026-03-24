"use client";

import dynamic from "next/dynamic";
import type {
  AdminGlobalTypeMetric,
  AdminGlobalUserMetric,
} from "@/server/admin/global-user-insights";

function ChartGridSkeleton() {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2" aria-hidden>
      <div className="panel-lux h-[320px] animate-pulse rounded-xl border border-brand-border bg-brand-surface/50" />
      <div className="panel-lux h-[320px] animate-pulse rounded-xl border border-brand-border bg-brand-surface/50" />
    </div>
  );
}

const AdminGlobalInsightsChartsInner = dynamic(
  () => import("@/components/admin-global-insights-charts").then((m) => m.AdminGlobalInsightsCharts),
  { ssr: false, loading: () => <ChartGridSkeleton /> }
);

export function AdminGlobalInsightsCharts(props: {
  byType: AdminGlobalTypeMetric[];
  byUserTop: AdminGlobalUserMetric[];
}) {
  return <AdminGlobalInsightsChartsInner {...props} />;
}
