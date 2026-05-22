import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Building2, UsersRound } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";
import { Card, CardContent } from "@/components/ui";
import { getCompanyPortfolioData } from "@/server/admin/company-portfolio";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}

export default async function CompanyAdminHomePage() {
  const portfolio = await getCompanyPortfolioData();

  return (
    <PageSection variant="plain" className="px-1 py-0 sm:px-2 md:px-2 md:pt-0 md:pb-0">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-brand-border/60 p-1.5">
              <BriefcaseBusiness className="h-4 w-4 text-brand-text" />
            </div>
            <h1 className="text-2xl font-bold text-brand-text">Admin da empresa</h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-brand-muted">
            Visao resumida da carteira para acompanhamento interno, distribuicao operacional e
            leitura rapida da base de clientes.
          </p>
        </div>
        <Link
          href="/superadmin"
          className="inline-flex items-center gap-2 rounded-full border border-brand-border px-3 py-1.5 text-xs text-brand-muted transition-colors hover:bg-brand-surface"
        >
          Ir para superadmin
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
              {formatNumber(portfolio.summary.activeTenants)} ativos na carteira
            </p>
          </CardContent>
        </Card>

        <Card className="border-brand-border bg-brand-surface">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-brand-muted">
              <UsersRound className="h-4 w-4" />
              <span>Relacionamentos</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-brand-text">
              {formatNumber(portfolio.summary.totalMemberships)}
            </p>
            <p className="mt-1 text-xs text-brand-muted">
              memberships ligadas aos clientes monitorados
            </p>
          </CardContent>
        </Card>

        <Card className="border-brand-border bg-brand-surface">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-brand-muted">
              <BriefcaseBusiness className="h-4 w-4" />
              <span>Base ativa</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-brand-text">
              {formatNumber(portfolio.summary.tenantsWithData)}
            </p>
            <p className="mt-1 text-xs text-brand-muted">clientes com leads, conversas ou oportunidades</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,1.6fr]">
        <Card className="border-brand-border bg-brand-surface">
          <CardContent className="p-5">
            <h2 className="text-base font-semibold text-brand-text">Proximo foco</h2>
            <p className="mt-2 text-sm text-brand-muted">
              Use esta area para acompanhar a carteira sem entrar na operacao tecnica da
              plataforma nem assumir a conta do cliente manualmente.
            </p>
            <Link
              href="/admin/clients"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-neon px-4 py-2 text-sm font-medium text-brand-dark transition-opacity hover:opacity-90"
            >
              Abrir carteira
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-brand-border bg-brand-surface">
          <CardContent className="p-5">
            <h2 className="text-base font-semibold text-brand-text">Resumo da carteira</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-brand-border bg-brand-surface/50 p-4">
                <p className="text-xs uppercase tracking-wide text-brand-muted">Leads</p>
                <p className="mt-2 text-xl font-semibold text-brand-text">
                  {formatNumber(portfolio.summary.totalLeads)}
                </p>
              </div>
              <div className="rounded-xl border border-brand-border bg-brand-surface/50 p-4">
                <p className="text-xs uppercase tracking-wide text-brand-muted">Conversas</p>
                <p className="mt-2 text-xl font-semibold text-brand-text">
                  {formatNumber(portfolio.summary.totalConversations)}
                </p>
              </div>
              <div className="rounded-xl border border-brand-border bg-brand-surface/50 p-4">
                <p className="text-xs uppercase tracking-wide text-brand-muted">Oportunidades</p>
                <p className="mt-2 text-xl font-semibold text-brand-text">
                  {formatNumber(portfolio.summary.totalOpportunities)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageSection>
  );
}
