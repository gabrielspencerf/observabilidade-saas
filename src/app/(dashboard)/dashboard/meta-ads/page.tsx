import Link from "next/link";
import { cookies } from "next/headers";
import {
  getDashboardTenantContext,
  listMetaAdsAccountsForTenant,
  listMetaInsightSnapshotsForTenant,
} from "@/server/dashboard";
import { PageSection, ListTableHeader, ListRowCard } from "@/components/layout";
import { DashboardPageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui";
import { Megaphone } from "lucide-react";
import { env } from "@/config/env";
import { getCsrfCookieName } from "@/server/security/csrf";
import { MetaCapiPanel, MetaPixelForm } from "./meta-ads-actions-client";

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(d));
}

function formatMoney(value: number, currency: string | null): string {
  const code =
    currency && typeof currency === "string" && currency.length === 3
      ? currency.toUpperCase()
      : null;
  if (code) {
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      // ignore
    }
  }
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function DashboardMetaAdsPage({
  searchParams,
}: {
  searchParams: Promise<{
    sync?: string;
    meta_ads?: string;
    meta_ads_error?: string;
    meta_ads_message?: string;
    accountId?: string;
    periodFrom?: string;
    periodTo?: string;
    page?: string;
  }>;
}) {
  const { tenantId } = await getDashboardTenantContext();
  const csrfToken = (await cookies()).get(getCsrfCookieName())?.value ?? "";
  const params = await searchParams;
  const accounts = await listMetaAdsAccountsForTenant(tenantId);

  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const accountFilter = params.accountId;
  const { items: snapshots, total } = await listMetaInsightSnapshotsForTenant(tenantId, {
    accountId: accountFilter,
    periodFrom: params.periodFrom,
    periodTo: params.periodTo,
    page,
    pageSize: 30,
  });

  const err = params.meta_ads_error;
  const errMsg = params.meta_ads_message;

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        icon={Megaphone}
        title="Meta Ads"
        description="Conecte sua conta Meta para acompanhar investimento, alcance e conversões."
      />

      {err ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <strong className="font-medium">Erro:</strong> {err}
          {errMsg ? ` — ${decodeURIComponent(errMsg)}` : null}
        </div>
      ) : null}

      {params.sync === "enqueued" ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Sincronização iniciada. Os dados serão atualizados em instantes.
        </div>
      ) : null}

      {params.meta_ads === "connected" ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Conta Meta conectada com sucesso.
        </div>
      ) : null}

      <PageSection>
        <span className="section-eyebrow mb-2">integrações</span>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-neon">
          Contas conectadas
        </h2>
        {accounts.length === 0 ? (
          <EmptyState
            title="Nenhuma conta Meta"
            description="Conecte uma conta para começar a acompanhar seus resultados."
          />
        ) : (
          <div className="space-y-4">
            {accounts.map((acc) => {
              return (
                <div
                  key={acc.id}
                  className="rounded-lg border border-brand-border bg-brand-surface/40 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-brand-text">
                        {acc.label ?? `Conta ${acc.externalId}`}
                      </p>
                      <p className="font-mono text-xs text-brand-muted">{acc.externalId}</p>
                      <p className="mt-1 text-xs text-brand-muted">
                        Último sync: {formatDate(acc.lastSyncedAt)}
                        {acc.lastSyncError ? ` · Erro: ${acc.lastSyncError}` : ""}
                      </p>
                      {acc.tokenExpiresAt ? (
                        <p className="text-xs text-brand-muted">
                          Token expira em: {formatDate(acc.tokenExpiresAt)} (reconecte se necessário)
                        </p>
                      ) : null}
                    </div>
                    <form action={`/api/meta-ads/sync/${acc.id}`} method="POST">
                      <input type="hidden" name="csrf_token" value={csrfToken} />
                      <Button type="submit" size="sm" variant="secondary">
                        Sincronizar agora
                      </Button>
                    </form>
                  </div>
                  <MetaPixelForm accountId={acc.id} initialPixelId={acc.pixelId} />
                  <MetaCapiPanel accountId={acc.id} hasPixel={Boolean(acc.pixelId?.trim())} />
                </div>
              );
            })}
          </div>
        )}

        {env.metaAdsConnectEnabled ? (
          <div className="mt-4">
            <Link
              href="/api/meta-ads/auth/start"
              className="btn-cta-primary inline-flex rounded-lg px-4 py-2 text-sm"
            >
              Conectar nova conta Meta
            </Link>
          </div>
        ) : (
          <p className="mt-4 text-sm text-brand-muted">
            A conexão com a Meta está indisponível no momento. Tente novamente mais tarde.
          </p>
        )}
      </PageSection>

      <PageSection>
        <span className="section-eyebrow mb-2">métricas</span>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-neon">
          Insights sincronizados (conta / dia)
        </h2>
        <div className="hidden sm:block">
          <ListTableHeader className="grid grid-cols-6 gap-3">
            <div>Conta</div>
            <div>Data</div>
            <div>Spend</div>
            <div>Impr.</div>
            <div>Cliques</div>
            <div>Sync</div>
          </ListTableHeader>
        </div>
        {snapshots.length === 0 ? (
          <p className="py-6 text-sm text-brand-muted">
            Ainda não há dados sincronizados. Conecte uma conta e atualize para visualizar.
          </p>
        ) : (
          snapshots.map((s) => {
            const acc = accounts.find((a) => a.id === s.metaAdsAccountId);
            const cur = acc?.currencyCode ?? null;
            return (
              <ListRowCard key={s.id} className="grid grid-cols-1 gap-2 sm:grid-cols-6 sm:items-center">
                <span className="font-mono text-xs text-brand-muted">{s.accountExternalId}</span>
                <span className="text-sm text-brand-text">{s.insightDate}</span>
                <span className="text-sm text-brand-text">{formatMoney(s.spend, cur)}</span>
                <span className="text-sm text-brand-text">
                  {new Intl.NumberFormat("pt-BR").format(s.impressions)}
                </span>
                <span className="text-sm text-brand-text">
                  {new Intl.NumberFormat("pt-BR").format(s.clicks)}
                </span>
                <span className="text-xs text-brand-muted">{formatDate(s.syncedAt)}</span>
              </ListRowCard>
            );
          })
        )}
        {total > snapshots.length ? (
          <p className="mt-2 text-xs text-brand-muted">
            Mostrando {snapshots.length} de {total}. Use filtros na próxima versão.
          </p>
        ) : null}
      </PageSection>
    </div>
  );
}
