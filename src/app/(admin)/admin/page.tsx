import Link from "next/link";
import { PageSection } from "@/components/layout/page-section";
import { Card, CardContent } from "@/components/ui";
import { AdminGlobalInsightsCharts } from "@/components/admin-global-insights-charts-lazy";
import { getAdminGlobalUserInsights } from "@/server/admin/global-user-insights";
import {
  BarChart3,
  Bot,
  Building2,
  Gauge,
  Settings2,
  Users,
  Waypoints,
} from "lucide-react";
import { agentDebugLog } from "@/server/debug/agent-debug-log";

const hubLinks = [
  {
    href: "/admin/integrations",
    title: "Integrações",
    description: "Configurar e monitorar integrações em nível de plataforma (Typebot, Evolution, Google Ads).",
    icon: Settings2,
  },
  {
    href: "/admin/agent",
    title: "Agente IA",
    description:
      "Configurar OpenAI, prompt comercial padrão, regras de follow-up e governança do agente.",
    icon: Bot,
  },
  {
    href: "/admin/worker-pipeline",
    title: "Worker & dados",
    description: "Mapa de filas Redis, workers e tabelas Postgres (fluxo ponta a ponta).",
    icon: Waypoints,
  },
  {
    href: "/admin/observability",
    title: "Observabilidade",
    description: "Visão das contas, tenants e saúde das conexões.",
    icon: Gauge,
  },
  {
    href: "/admin/tenants",
    title: "Tenants",
    description: "Listar, criar e editar tenants.",
    icon: Building2,
  },
  {
    href: "/admin/users",
    title: "Usuários",
    description: "Listar usuários e memberships.",
    icon: Users,
  },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}

export default async function AdminPage() {
  const globalInsights = await getAdminGlobalUserInsights();
  agentDebugLog({
    runId: "admin-pages-styling",
    hypothesisId: "H_ADMIN_HOME_1",
    location: "src/app/(admin)/admin/page.tsx:AdminPage",
    message: "Render do início admin com estilo enriquecido",
    data: {
      hubLinks: hubLinks.length,
      totalInfos: globalInsights.totals.totalInfos,
      usersWithMembership: globalInsights.totals.usersWithMembership,
    },
  });

  return (
    <PageSection variant="plain" className="px-1 py-0 sm:px-2 md:px-2 md:pt-0 md:pb-0">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-brand-border/60 p-1.5">
              <BarChart3 className="h-4 w-4 text-brand-text" />
            </div>
            <h1 className="text-2xl font-bold text-brand-text">Admin central</h1>
          </div>
          <p className="mt-2 text-brand-muted">
            Gestão da base, integrações e observabilidade. Escolha uma área abaixo.
          </p>
        </div>
        <span className="rounded-full border border-brand-border px-2.5 py-1 text-xs text-brand-muted">
          Hub da plataforma
        </span>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hubLinks.map((item) => (
          <Link key={item.href} href={item.href} className="group">
            <Card className="h-full transition-all group-hover:border-brand-neon/50 group-hover:shadow-md bg-brand-surface border-brand-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-neon/10 text-brand-neon">
                    <item.icon className="h-4 w-4" />
                  </div>
                </div>
                <h2 className="font-semibold text-brand-text group-hover:text-brand-neon transition-colors">{item.title}</h2>
                <p className="mt-2 text-sm text-brand-muted">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="bg-brand-surface border-brand-border">
          <CardContent className="p-4">
            <p className="text-sm text-brand-muted">Infos globais</p>
            <p className="mt-1 text-2xl font-semibold text-brand-text">
              {formatNumber(globalInsights.totals.totalInfos)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-brand-surface border-brand-border">
          <CardContent className="p-4">
            <p className="text-sm text-brand-muted">Contas com membership</p>
            <p className="mt-1 text-2xl font-semibold text-brand-text">
              {formatNumber(globalInsights.totals.usersWithMembership)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-brand-surface border-brand-border">
          <CardContent className="p-4">
            <p className="text-sm text-brand-muted">Média por conta</p>
            <p className="mt-1 text-2xl font-semibold text-brand-text">
              {formatNumber(globalInsights.totals.avgInfosPerUser)}
            </p>
          </CardContent>
        </Card>
      </div>

      <AdminGlobalInsightsCharts
        byType={globalInsights.byType}
        byUserTop={globalInsights.byUserTop}
      />
    </PageSection>
  );
}
