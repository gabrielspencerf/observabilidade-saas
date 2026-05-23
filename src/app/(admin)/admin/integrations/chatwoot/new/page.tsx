"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { adminGet, adminPost } from "@/features/shared/api/admin-api-client";

type Tenant = { id: string; name: string; slug: string };

export default function NewChatwootAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [externalId, setExternalId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [inboxId, setInboxId] = useState("");
  const [label, setLabel] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ id: string; webhook_url: string } | null>(
    null
  );

  useEffect(() => {
    const preselectedTenantId = searchParams.get("tenantId");
    if (preselectedTenantId) setTenantId(preselectedTenantId);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    adminGet<{ tenants?: Tenant[] }>("/api/admin/tenants").then((result) => {
      if (cancelled) return;
      setTenants(result.data?.tenants ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await adminPost<{ id: string; webhook_url?: string }>(
      "/api/admin/integrations/chatwoot",
      {
        tenant_id: tenantId,
        external_id: externalId.trim(),
        base_url: baseUrl.trim(),
        inbox_id: inboxId.trim() || undefined,
        label: label.trim() || undefined,
        api_token: apiToken.trim() || undefined,
      }
    );
    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }
    setCreated({ id: result.data!.id, webhook_url: result.data!.webhook_url ?? "" });
    router.refresh();
    setSubmitting(false);
  }

  if (created) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Link
            href="/superadmin/integrations"
            className="text-sm text-brand-neon hover:opacity-90"
          >
            ← Voltar às integrações
          </Link>
        </div>
        <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
          <h2 className="text-lg font-semibold text-brand-text">Conta Chatwoot conectada</h2>
          <p className="mt-2 text-sm text-brand-muted">
            Configure no painel do Chatwoot a URL de webhook abaixo (HMAC-SHA256 com o
            api_access_token da conta, header <code>x-chatwoot-signature</code>).
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="block max-w-full break-all rounded-lg bg-brand-dark px-3 py-2 text-sm text-brand-neon">
              {created.webhook_url}
            </code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigator.clipboard.writeText(created.webhook_url)}
            >
              Copiar
            </Button>
          </div>
        </div>
        <p className="mt-4">
          <Link
            href="/superadmin/integrations/chatwoot/new"
            className="text-sm text-brand-neon hover:opacity-90"
          >
            Cadastrar outra conta
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link
          href="/superadmin/integrations"
          className="text-sm text-brand-neon hover:opacity-90"
        >
          ← Voltar às integrações
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-brand-text">Conectar conta Chatwoot</h1>
      <p className="mt-1 text-sm text-brand-muted">
        Cadastre uma conta Chatwoot para receber webhooks (mensagens, conversas e status).
      </p>
      <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400"
          >
            {error}
          </div>
        )}
        <div>
          <label htmlFor="tenant" className="block text-sm font-medium text-brand-muted">
            Tenant
          </label>
          <select
            id="tenant"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="app-select mt-1 block"
            required
          >
            <option value="">Selecione</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="external_id" className="block text-sm font-medium text-brand-muted">
            Account ID no Chatwoot (external_id)
          </label>
          <Input
            id="external_id"
            type="text"
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            placeholder="Ex.: 12 (numérico do Chatwoot)"
            className="mt-1"
            required
          />
        </div>
        <div>
          <label htmlFor="base_url" className="block text-sm font-medium text-brand-muted">
            Base URL do Chatwoot
          </label>
          <Input
            id="base_url"
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://chatwoot.exemplo.com.br"
            className="mt-1"
            required
          />
        </div>
        <div>
          <label htmlFor="inbox_id" className="block text-sm font-medium text-brand-muted">
            Inbox ID (opcional)
          </label>
          <Input
            id="inbox_id"
            type="text"
            value={inboxId}
            onChange={(e) => setInboxId(e.target.value)}
            placeholder="Restringe ingestão a um inbox específico"
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor="label" className="block text-sm font-medium text-brand-muted">
            Rótulo (opcional)
          </label>
          <Input
            id="label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex.: Atendimento principal"
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor="api_token" className="block text-sm font-medium text-brand-muted">
            API Token do Chatwoot (opcional)
          </label>
          <Input
            id="api_token"
            type="password"
            autoComplete="new-password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="Necessário para chamadas saída/sync ao Chatwoot"
            className="mt-1"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Conectando…" : "Conectar"}
          </Button>
          <Link href="/superadmin/integrations">
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
