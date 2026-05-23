"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { ProviderBrandIcon } from "@/components/provider-brand-icon";
import { adminGet, adminPatch } from "@/features/shared/api/admin-api-client";

type TypebotResponse = {
  id: string;
  tenantId: string;
  externalId: string;
  name: string | null;
  metricsApiBaseUrl: string | null;
  hasWebhookSecret?: boolean;
  hasApiToken?: boolean;
};

export default function EditTypebotBotPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [externalId, setExternalId] = useState("");
  const [name, setName] = useState("");
  const [metricsApiBaseUrl, setMetricsApiBaseUrl] = useState("");
  const [hasWebhookSecret, setHasWebhookSecret] = useState(false);
  const [hasApiToken, setHasApiToken] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [clearWebhookSecret, setClearWebhookSecret] = useState(false);
  const [clearApiToken, setClearApiToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminGet<TypebotResponse>(`/api/admin/integrations/typebot/${id}`).then(
      (result) => {
        if (cancelled) return;
        if (result.error) {
          setError(result.error.message);
        } else {
          const data = result.data!;
          setExternalId(data.externalId ?? "");
          setName(data.name ?? "");
          setMetricsApiBaseUrl(data.metricsApiBaseUrl ?? "");
          setHasWebhookSecret(Boolean(data.hasWebhookSecret));
          setHasApiToken(Boolean(data.hasApiToken));
        }
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const body: Record<string, unknown> = {
      external_id: externalId.trim(),
      name: name.trim() || null,
      metrics_api_base_url: metricsApiBaseUrl.trim() || null,
    };
    if (clearWebhookSecret) {
      body.webhook_secret = "";
    } else if (webhookSecret.trim()) {
      body.webhook_secret = webhookSecret.trim();
    }
    if (clearApiToken) {
      body.api_token = "";
    } else if (apiToken.trim()) {
      body.api_token = apiToken.trim();
    }
    const result = await adminPatch(`/api/admin/integrations/typebot/${id}`, body);
    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }
    router.push("/superadmin/integrations");
    router.refresh();
    setSubmitting(false);
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/superadmin/integrations" className="text-sm text-brand-neon hover:opacity-90">
          ← Voltar às integrações
        </Link>
      </div>
      <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-brand-text">
        <ProviderBrandIcon provider="typebot" className="h-5 w-5 rounded" />
        Editar bot Typebot
      </h1>
      <p className="mt-1 text-sm text-brand-muted">
        Atualize os dados do bot. Webhook secret e token só são alterados se preenchidos.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
        {loading ? (
          <p className="text-sm text-brand-muted">Carregando…</p>
        ) : (
          <>
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400"
              >
                {error}
              </div>
            )}
            <div>
              <label htmlFor="external_id" className="block text-sm font-medium text-brand-muted">
                ID do bot no Typebot (external_id)
              </label>
              <Input
                id="external_id"
                type="text"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-brand-muted">
                Nome (opcional)
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="metrics_api_base_url" className="block text-sm font-medium text-brand-muted">
                Base URL da API de métricas (opcional)
              </label>
              <Input
                id="metrics_api_base_url"
                type="url"
                value={metricsApiBaseUrl}
                onChange={(e) => setMetricsApiBaseUrl(e.target.value)}
                placeholder="https://api.typebot.io"
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="webhook_secret" className="block text-sm font-medium text-brand-muted">
                Webhook secret {hasWebhookSecret && <span className="ml-1 text-xs text-emerald-400">(configurado)</span>}
              </label>
              <Input
                id="webhook_secret"
                type="password"
                autoComplete="new-password"
                value={webhookSecret}
                onChange={(e) => {
                  setWebhookSecret(e.target.value);
                  if (e.target.value) setClearWebhookSecret(false);
                }}
                placeholder={hasWebhookSecret ? "Deixe em branco para manter" : "Defina um secret HMAC"}
                disabled={clearWebhookSecret}
                className="mt-1"
              />
              {hasWebhookSecret && (
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-brand-muted">
                  <input
                    type="checkbox"
                    checked={clearWebhookSecret}
                    onChange={(e) => {
                      setClearWebhookSecret(e.target.checked);
                      if (e.target.checked) setWebhookSecret("");
                    }}
                  />
                  Remover webhook secret atual
                </label>
              )}
            </div>
            <div>
              <label htmlFor="api_token" className="block text-sm font-medium text-brand-muted">
                Token da API de métricas {hasApiToken && <span className="ml-1 text-xs text-emerald-400">(configurado)</span>}
              </label>
              <Input
                id="api_token"
                type="password"
                autoComplete="new-password"
                value={apiToken}
                onChange={(e) => {
                  setApiToken(e.target.value);
                  if (e.target.value) setClearApiToken(false);
                }}
                placeholder={hasApiToken ? "Deixe em branco para manter" : "Token Typebot API"}
                disabled={clearApiToken}
                className="mt-1"
              />
              {hasApiToken && (
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-brand-muted">
                  <input
                    type="checkbox"
                    checked={clearApiToken}
                    onChange={(e) => {
                      setClearApiToken(e.target.checked);
                      if (e.target.checked) setApiToken("");
                    }}
                  />
                  Remover token atual
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando…" : "Salvar alterações"}
              </Button>
              <Link href="/superadmin/integrations">
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </Link>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
