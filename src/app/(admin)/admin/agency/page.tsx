import Link from "next/link";
import { BriefcaseBusiness, Building2, MessageSquareText, Users } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";
import { Card, CardContent } from "@/components/ui";
import { getCompanyPortfolioData } from "@/server/admin/company-portfolio";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}

function formatDateTime(value: string | null): string {
  if (!value) return "Sem atividade";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem atividade";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function healthBadge(health: "healthy" | "attention" | "idle") {
  if (health === "healthy") {
    return {
      label: "Saudavel",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    };
  }
  if (health === "attention") {
    return {
      label: "Atencao",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    };
  }
  return {
    label: "Inativo",
    className: "border-brand-border bg-brand-surface/60 text-brand-muted",
  };
}

export default async function CompanyClientsPage() {
  const portfolio = await getCompanyPortfolioData();
  const topTenants = portfolio.tenants
    .slice()
    .sort((a, b) => b.leads + b.conversations - (a.leads + a.conversations))
    .slice(0, 5);
  const maxTopVolume = Math.max(...topTenants.map((tenant) => tenant.leads + tenant.conversations), 1);

  return (
    <PageSection variant="plain" className="px-1 py-0 sm:px-2 md:px-2 md:pt-0 md:pb-0">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-brand-border/60 p-1.5">
                <BriefcaseBusiness className="h-4 w-4 text-brand-text" />
              </div>
              <h1 className="text-2xl font-bold text-brand-text">Clientes da empresa</h1>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-brand-muted">
              Visao central da base de clientes para operacao interna: volume por tenant,
              atividade recente, integracoes ativas e sinais rapidos de atencao.
            </p>
          </div>
          <span className="rounded-full border border-brand-border px-2.5 py-1 text-xs text-brand-muted">
            Carteira resumida
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-brand-border bg-brand-surface">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-brand-muted">
                <Building2 className="h-4 w-4" />
                <span>Clientes</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-brand-text">
                {formatNumber(portfolio.summary.totalTenants)}
              </p>
              <p className="mt-1 text-xs text-brand-muted">
                {formatNumber(portfolio.summary.activeTenants)} ativos
              </p>
            </CardContent>
          </Card>
          <Card className="border-brand-border bg-brand-surface">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-brand-muted">
                <Users className="h-4 w-4" />
                <span>Memberships</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-brand-text">
                {formatNumber(portfolio.summary.totalMemberships)}
              </p>
              <p className="mt-1 text-xs text-brand-muted">
                {formatNumber(portfolio.summary.tenantsWithData)} clientes com dados
              </p>
            </CardContent>
          </Card>
          <Card className="border-brand-border bg-brand-surface">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-brand-muted">
                <Users className="h-4 w-4" />
                <span>Leads</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-brand-text">
                {formatNumber(portfolio.summary.totalLeads)}
              </p>
              <p className="mt-1 text-xs text-brand-muted">Base consolidada da carteira</p>
            </CardContent>
          </Card>
          <Card className="border-brand-border bg-brand-surface">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-brand-muted">
                <MessageSquareText className="h-4 w-4" />
                <span>Conversas e oportunidades</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-brand-text">
                {formatNumber(portfolio.summary.totalConversations)}
              </p>
              <p className="mt-1 text-xs text-brand-muted">
                {formatNumber(portfolio.summary.totalOpportunities)} oportunidades no total
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr,1.4fr]">
          <Card className="border-brand-border bg-brand-surface">
            <CardContent className="p-5">
              <h2 className="text-base font-semibold text-brand-text">Top clientes por volume</h2>
              <p className="mt-2 text-xs text-brand-muted">
                Soma simples de leads e conversas para priorizacao operacional.
              </p>
              <div className="mt-4 space-y-3">
                {topTenants.length === 0 ? (
                  <p className="text-sm text-brand-muted">Nenhum cliente com dados ainda.</p>
                ) : (
                  topTenants.map((tenant) => {
                    const totalVolume = tenant.leads + tenant.conversations;
                    const width = Math.max(10, Math.round((totalVolume / maxTopVolume) * 100));
                    return (
                      <div key={tenant.tenantId} className="rounded-lg border border-brand-border/70 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-brand-text">
                              {tenant.tenantName}
                            </p>
                            <p className="text-xs text-brand-muted">
                              {tenant.leads} leads • {tenant.conversations} conversas
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-brand-text">
                            {formatNumber(totalVolume)}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-brand-border/50">
                          <div
                            className="h-1.5 rounded-full bg-brand-neon/80"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-brand-border bg-brand-surface">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-brand-text">Base por cliente</h2>
                  <p className="mt-1 text-xs text-brand-muted">
                    Painel central para a empresa acompanhar atividade, dados e sinais de risco.
                  </p>
                </div>
                <Link
                  href="/superadmin/tenants"
                  className="text-xs font-medium text-brand-neon transition-opacity hover:opacity-80"
                >
                  Abrir superadmin
                </Link>
              </div>

              {portfolio.tenants.length === 0 ? (
                <div className="mt-4 rounded-xl border border-brand-border bg-brand-surface/50 p-4 text-sm text-brand-muted">
                  Nenhum tenant cadastrado ainda.
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border text-left text-xs uppercase tracking-wide text-brand-muted">
                        <th className="px-3 py-2 font-medium">Cliente</th>
                        <th className="px-3 py-2 font-medium">Saude</th>
                        <th className="px-3 py-2 font-medium">Base</th>
                        <th className="px-3 py-2 font-medium">Integracoes</th>
                        <th className="px-3 py-2 font-medium">Atividade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.tenants.map((tenant) => {
                        const badge = healthBadge(tenant.health);
                        return (
                          <tr key={tenant.tenantId} className="border-b border-brand-border/60 align-top">
                            <td className="px-3 py-3">
                              <div className="min-w-[180px]">
                                <p className="font-medium text-brand-text">{tenant.tenantName}</p>
                                <p className="text-xs text-brand-muted">
                                  /{tenant.tenantSlug} • {tenant.memberships} memberships
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                  <Link
                                    href={`/superadmin/tenants/${tenant.tenantId}`}
                                    className="text-brand-neon transition-opacity hover:opacity-80"
                                  >
                                    Abrir tenant
                                  </Link>
                                  <Link
                                    href="/superadmin/integrations"
                                    className="text-brand-neon transition-opacity hover:opacity-80"
                                  >
                                    Integracoes
                                  </Link>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex rounded-full border px-2 py-1 text-xs ${badge.className}`}>
                                {badge.label}
                              </span>
                              <p className="mt-2 text-xs text-brand-muted">
                                {tenant.isActive ? "Tenant ativo" : "Tenant desativado"}
                              </p>
                            </td>
                            <td className="px-3 py-3 text-xs text-brand-muted">
                              <p>
                                <span className="font-medium text-brand-text">{tenant.leads}</span> leads
                              </p>
                              <p>
                                <span className="font-medium text-brand-text">{tenant.conversations}</span> conversas
                              </p>
                              <p>
                                <span className="font-medium text-brand-text">{tenant.opportunities}</span> oportunidades
                              </p>
                              <p>
                                <span className="font-medium text-brand-text">{tenant.openOpportunities}</span> abertas/qualificadas
                              </p>
                            </td>
                            <td className="px-3 py-3 text-xs text-brand-muted">
                              <p>
                                <span className="font-medium text-brand-text">
                                  {tenant.integrationsConfigured}
                                </span>{" "}
                                configuradas
                              </p>
                            </td>
                            <td className="px-3 py-3 text-xs text-brand-muted">
                              <p>Ultimo lead: {formatDateTime(tenant.lastLeadAt)}</p>
                              <p>Ultima conversa: {formatDateTime(tenant.lastConversationAt)}</p>
                              <p>Ultimo toque: {formatDateTime(tenant.lastTouchAt)}</p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageSection>
  );
}
