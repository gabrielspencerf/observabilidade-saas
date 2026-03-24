"use client";

import dynamic from "next/dynamic";

function ChartSkeleton() {
  return (
    <div
      className="h-[280px] w-full animate-pulse rounded-xl border border-brand-border bg-brand-surface/50"
      aria-hidden
    />
  );
}

export const LeadsChart = dynamic(
  () => import("@/components/dashboard-charts").then((m) => m.LeadsChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const AdsSpendChart = dynamic(
  () => import("@/components/dashboard-charts").then((m) => m.AdsSpendChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export type { LeadsChartDataItem, AdsSpendChartDataItem } from "@/components/dashboard-charts";
