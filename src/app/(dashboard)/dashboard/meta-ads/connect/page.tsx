import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getDashboardTenantContext } from "@/server/dashboard";
import { loadPendingMetaConnection } from "@/server/meta-ads-pending";
import { env } from "@/config/env";
import { getCsrfCookieName } from "@/server/security/csrf";

export default async function MetaAdsConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ pending?: string }>;
}) {
  if (!env.metaAdsConnectEnabled) {
    redirect(
      "/dashboard/meta-ads?meta_ads_error=feature_disabled&meta_ads_message=Conexão Meta desativada neste ambiente."
    );
  }

  const { tenantId } = await getDashboardTenantContext();
  const params = await searchParams;
  const pendingToken = typeof params.pending === "string" ? params.pending : null;

  if (!pendingToken) {
    redirect("/dashboard/meta-ads?meta_ads_error=missing_pending");
  }

  const pending = await loadPendingMetaConnection(pendingToken, tenantId);
  if (!pending) {
    redirect(
      "/dashboard/meta-ads?meta_ads_error=invalid_pending&meta_ads_message=Link expirado ou inválido. Conecte novamente."
    );
  }

  const csrfToken = (await cookies()).get(getCsrfCookieName())?.value ?? "";

  return (
    <div className="px-1 py-0 sm:px-2">
      <h1 className="text-xl font-semibold text-brand-text">Escolher conta Meta Ads</h1>
      <p className="mt-2 text-brand-muted">
        Selecione o Ad Account vinculado ao seu negócio. O link expira em poucos minutos.
      </p>

      <form
        action="/api/meta-ads/auth/complete"
        method="POST"
        className="panel-lux mt-6 max-w-lg rounded-lg border border-brand-border bg-brand-surface p-4"
      >
        <input type="hidden" name="csrf_token" value={csrfToken} />
        <input type="hidden" name="pending" value={pendingToken} />
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-brand-muted">Conta de anúncios</legend>
          {pending.adAccounts.map((a) => (
            <label
              key={a.id}
              className="flex cursor-pointer flex-col gap-1 rounded border border-brand-border p-3 transition-colors hover:bg-brand-surface/70 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="externalId"
                  value={a.accountId}
                  required
                  className="h-4 w-4"
                />
                <span className="text-brand-text">{a.name}</span>
              </span>
              <span className="font-mono text-xs text-brand-muted">
                {a.accountId}
                {a.currency ? ` · ${a.currency}` : ""}
              </span>
            </label>
          ))}
        </fieldset>
        <div className="mt-4">
          <label htmlFor="label" className="block text-sm font-medium text-brand-muted">
            Rótulo (opcional)
          </label>
          <input
            id="label"
            type="text"
            name="label"
            maxLength={255}
            placeholder="Ex: Conta BR — performance"
            className="mt-1 w-full rounded border border-brand-border bg-brand-dark/50 px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-neon"
          />
        </div>
        <div className="mt-6 flex gap-3">
          <button type="submit" className="btn-cta-primary rounded-lg px-4 py-2 text-sm">
            Conectar esta conta
          </button>
          <Link
            href="/dashboard/meta-ads"
            className="rounded border border-brand-border px-4 py-2 text-sm text-brand-text transition-colors hover:bg-brand-surface"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
