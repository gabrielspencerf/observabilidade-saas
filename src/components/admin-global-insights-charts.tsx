"use client";

import { useTheme } from "next-themes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type {
  AdminGlobalTypeMetric,
  AdminGlobalUserMetric,
} from "@/server/admin/global-user-insights";

interface AdminGlobalInsightsChartsProps {
  byType: AdminGlobalTypeMetric[];
  byUserTop: AdminGlobalUserMetric[];
}

const CHART_THEME = {
  light: {
    grid: "rgba(113, 113, 122, 0.2)",
    text: "#71717a",
    neon: "#00a064",
    tooltipBg: "#ffffff",
    tooltipBorder: "#e4e4e7",
    tooltipText: "#18181b",
  },
  dark: {
    grid: "rgba(161, 161, 170, 0.15)",
    text: "#a1a1aa",
    neon: "#00c882",
    tooltipBg: "#0c0f0d",
    tooltipBorder: "#1a201c",
    tooltipText: "#f0f5f2",
  },
} as const;

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}

export function AdminGlobalInsightsCharts({
  byType,
  byUserTop,
}: AdminGlobalInsightsChartsProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const th = isLight ? CHART_THEME.light : CHART_THEME.dark;

  const userChartData = byUserTop.map((row) => ({
    user: row.userEmail.split("@")[0],
    infos: row.totalInfos,
  }));

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="panel-lux rounded-xl border border-brand-border bg-brand-surface p-5">
        <h2 className="text-sm font-medium text-brand-muted">Infos por tipo</h2>
        <div className="mt-2 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byType} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="4 6" stroke={th.grid} vertical={false} />
              <XAxis
                dataKey="name"
                stroke={th.text}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke={th.text} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: th.tooltipBg,
                  border: `1px solid ${th.tooltipBorder}`,
                  borderRadius: 12,
                  color: th.tooltipText,
                }}
                formatter={(value: unknown) => [formatNumber(Number(value ?? 0)), "Infos"]}
              />
              <Bar dataKey="total" fill={th.neon} radius={[10, 10, 0, 0]} maxBarSize={54} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel-lux rounded-xl border border-brand-border bg-brand-surface p-5">
        <h2 className="text-sm font-medium text-brand-muted">Top contas de usuário</h2>
        <div className="mt-2 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={userChartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="4 6" stroke={th.grid} vertical={false} />
              <XAxis
                dataKey="user"
                stroke={th.text}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={42}
              />
              <YAxis stroke={th.text} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: th.tooltipBg,
                  border: `1px solid ${th.tooltipBorder}`,
                  borderRadius: 12,
                  color: th.tooltipText,
                }}
                formatter={(value: unknown) => [formatNumber(Number(value ?? 0)), "Infos"]}
              />
              <Bar dataKey="infos" fill={th.neon} radius={[10, 10, 0, 0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
