import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardTenantContext } from "@/server/dashboard";
import { loadPendingConnection } from "@/server/google-ads-pending";

export default async function GoogleAdsConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ pending?: string }>;
}) {
  const { tenantId } = await getDashboardTenantContext();
  const params = await searchParams;
  const pendingToken = typeof params.pending === "string" ? params.pending : null;

  if (!pendingToken) {
    redirect("/dashboard/google-ads?google_ads_error=missing_pending");
  }

  const pending = await loadPendingConnection(pendingToken, tenantId);
  if (!pending) {
    redirect(
      "/dashboard/google-ads?google_ads_error=invalid_pending&google_ads_message=Link expirado ou inválido. Conecte novamente."
    );
  }

  const { customerIds } = pending;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-neutral-900">
        Escolher conta Google Ads
      </h1>
      <p className="mt-2 text-neutral-600">
        Selecione a conta que deseja conectar a este tenant. O link expira em
        10 minutos.
      </p>

      <form
        action="/api/google-ads/auth/complete"
        method="POST"
        className="mt-6 max-w-md rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input
          type="hidden"
          name="pending"
          value={pendingToken}
        />
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-neutral-700">
            Conta (Customer ID)
          </legend>
          {customerIds.map((id) => (
            <label
              key={id}
              className="flex cursor-pointer items-center gap-2 rounded border border-neutral-200 p-3 hover:bg-neutral-50"
            >
              <input
                type="radio"
                name="externalId"
                value={id}
                required
                className="h-4 w-4"
              />
              <span className="font-mono text-neutral-900">{id}</span>
            </label>
          ))}
        </fieldset>
        <div className="mt-4">
          <label htmlFor="label" className="block text-sm font-medium text-neutral-700">
            Rótulo (opcional)
          </label>
          <input
            id="label"
            type="text"
            name="label"
            maxLength={255}
            placeholder="Ex: Conta principal"
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            className="rounded bg-neutral-800 px-4 py-2 text-sm text-white hover:bg-neutral-700"
          >
            Conectar esta conta
          </button>
          <Link
            href="/dashboard/google-ads"
            className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
