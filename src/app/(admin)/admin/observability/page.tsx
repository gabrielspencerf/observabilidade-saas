import { PageSection } from "@/components/layout/page-section";
import { Card, CardContent } from "@/components/ui";
import { getObservabilitySnapshot } from "@/server/admin/observability";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock3,
  TriangleAlert,
  Workflow,
} from "lucide-react";
import { ObservabilityPlaybookHelp } from "@/components/observability-playbook-help";
import { ObservabilityStatusDiagnosticModal } from "@/components/observability-status-diagnostic-modal";
import { ObservabilityServiceMiniTrend } from "@/components/observability-service-mini-trend";
import { ProviderBrandIcon } from "@/components/provider-brand-icon";
import { InfraServiceIcon } from "@/components/infra-service-icon";

function statusBadge(status: string) {
  if (status === "ok" || status === "online") {
    return "text-emerald-600 dark:text-emerald-300";
  }
  if (status === "stale" || status.includes("http_")) {
    return "text-amber-600 dark:text-amber-300";
  }
  return "text-red-600 dark:text-red-300";
}

function statusLabel(status: string): string {
  if (status === "online") return "Online";
  if (status === "timeout") return "Timeout";
  if (status === "unreachable") return "Inacessível";
  if (status.startsWith("http_")) return `HTTP ${status.replace("http_", "")}`;
  if (status === "ok") return "OK";
  if (status === "stale") return "Desatualizado";
  return status;
}

function webhookSourceLabel(source: "evolution" | "uazapi" | "typebot"): string {
  if (source === "evolution") return "Evolution";
  if (source === "uazapi") return "UAZAPI";
  return "Typebot";
}

function webhookStatus(event: { processedAt: string | null; processingError: string | null }) {
  if (event.processingError) return "erro";
  if (event.processedAt) return "processado";
  return "pendente";
}

type IntegrationStatusItem = {
  instanceId: string;
  tenantId: string;
  tenantName: string;
  status: string;
  latencyMs: number;
  details?: {
    externalId?: string;
    endpointChecked?: string;
    checkedAt?: string;
    statusCode?: number;
    statusText?: string;
    errorType?: string;
    error?: string;
    hint?: string;
    bodyPreview?: string;
  };
};

function groupByTenant(items: IntegrationStatusItem[]) {
  const map = new Map<string, { tenantId: string; tenantName: string; items: IntegrationStatusItem[] }>();
  for (const item of items) {
    const existing = map.get(item.tenantId);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    map.set(item.tenantId, {
      tenantId: item.tenantId,
      tenantName: item.tenantName,
      items: [item],
    });
  }
  return Array.from(map.values()).sort((a, b) => a.tenantName.localeCompare(b.tenantName));
}

export default async function AdminObservabilityPage() {
  const snapshot = await getObservabilitySnapshot();
  const evolutionByTenant = groupByTenant(snapshot.integrations.evolution);
  const uazapiByTenant = groupByTenant(snapshot.integrations.uazapi);
  const formatDuration = (ms: number | null) => {
    if (ms === null) return "—";
    if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}min`;
    return `${Math.round(ms / 3_600_000)}h`;
  };
  const queueItems = [
    {
      label: "Typebot",
      provider: "typebot" as const,
      value: snapshot.queue.typebotDepth,
      dlq: snapshot.queue.typebotDlqDepth,
    },
    {
      label: "Evolution",
      provider: "evolution" as const,
      value: snapshot.queue.evolutionDepth,
      dlq: snapshot.queue.evolutionDlqDepth,
    },
    {
      label: "UAZAPI",
      provider: "uazapi" as const,
      value: snapshot.queue.uazapiDepth,
      dlq: snapshot.queue.uazapiDlqDepth,
    },
    {
      label: "Google Ads",
      provider: "googleAds" as const,
      value: snapshot.queue.googleAdsDepth,
      dlq: snapshot.queue.googleAdsDlqDepth,
    },
    {
      label: "IA Classificação",
      value: snapshot.queue.aiClassificationDepth,
      dlq: snapshot.queue.aiClassificationDlqDepth,
    },
  ];
  const maxQueueValue = Math.max(...queueItems.map((item) => item.value), 1);

  return (
    <PageSection variant="plain" className="px-1 py-0 sm:px-2 md:px-2 md:pt-0 md:pb-0">
      <div className="mx-auto w-full max-w-7xl">
      <div className="mb-2 flex flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-brand-text">Observabilidade</h1>
        <div className="flex justify-center">
          <ObservabilityPlaybookHelp />
        </div>
      </div>
      <p className="text-center text-brand-muted">
        Estado operacional em tempo real: serviços, filas, instâncias e erros.
      </p>

      <div className="mt-6 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="h-full bg-brand-surface border-brand-border">
          <CardContent className="flex h-full flex-col p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-brand-muted">
              <InfraServiceIcon service="api" />
              <span>API</span>
            </div>
            <p className={`mt-2 text-lg font-semibold ${statusBadge(snapshot.services.api)}`}>
              {snapshot.services.api}
            </p>
            <p className="mt-1 text-xs text-brand-muted">{snapshot.serviceDetails.api.summary}</p>
            <p className="mt-2 text-[11px] text-brand-muted">
              Atualizado em {new Date(snapshot.serviceDetails.api.checkedAt).toLocaleTimeString("pt-BR")}
            </p>
            <div className="mt-auto">
              <ObservabilityServiceMiniTrend
                values={snapshot.serviceVisuals.api}
                labels={snapshot.serviceVisuals.labels}
                tone={snapshot.services.api === "ok" ? "emerald" : "amber"}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="h-full bg-brand-surface border-brand-border">
          <CardContent className="flex h-full flex-col p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-brand-muted">
              <InfraServiceIcon service="db" />
              <span>Banco</span>
            </div>
            <p className={`mt-2 text-lg font-semibold ${statusBadge(snapshot.services.db)}`}>
              {snapshot.services.db}
            </p>
            <p className="mt-1 text-xs text-brand-muted">{snapshot.serviceDetails.db.summary}</p>
            <p className="mt-2 text-[11px] text-brand-muted">
              Probe: {snapshot.serviceDetails.db.probe}
            </p>
            <div className="mt-auto">
              <ObservabilityServiceMiniTrend
                values={snapshot.serviceVisuals.db}
                labels={snapshot.serviceVisuals.labels}
                tone={snapshot.services.db === "ok" ? "emerald" : "red"}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="h-full bg-brand-surface border-brand-border">
          <CardContent className="flex h-full flex-col p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-brand-muted">
              <InfraServiceIcon service="redis" />
              <span>Redis</span>
            </div>
            <p className={`mt-2 text-lg font-semibold ${statusBadge(snapshot.services.redis)}`}>
              {snapshot.services.redis}
            </p>
            <p className="mt-1 text-xs text-brand-muted">{snapshot.serviceDetails.redis.summary}</p>
            <p className="mt-2 text-[11px] text-brand-muted">
              Filas: {snapshot.serviceDetails.redis.queueDepthTotal} • DLQ: {snapshot.serviceDetails.redis.dlqDepthTotal}
            </p>
            <div className="mt-auto">
              <ObservabilityServiceMiniTrend
                values={snapshot.serviceVisuals.redis}
                labels={snapshot.serviceVisuals.labels}
                tone={snapshot.services.redis === "ok" ? "emerald" : "red"}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="h-full bg-brand-surface border-brand-border">
          <CardContent className="flex h-full flex-col p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-brand-muted">
              <InfraServiceIcon service="worker" />
              <span>Worker</span>
            </div>
            <p className={`mt-2 text-lg font-semibold ${statusBadge(snapshot.services.worker)}`}>
              {snapshot.services.worker}
            </p>
            <p className="mt-1 text-xs text-brand-muted">{snapshot.serviceDetails.worker.summary}</p>
            <p className="mt-2 text-[11px] text-brand-muted">
              Heartbeat: {snapshot.serviceDetails.worker.lastHeartbeatAt
                ? `${formatDuration(snapshot.serviceDetails.worker.heartbeatAgeMs)} atrás`
                : "não informado"}
            </p>
            <p className="mt-1 text-[11px] text-brand-muted">
              Backlog total: {snapshot.serviceDetails.worker.backlogTotal}
            </p>
            <div className="mt-auto">
              <ObservabilityServiceMiniTrend
                values={snapshot.serviceVisuals.worker}
                labels={snapshot.serviceVisuals.labels}
                tone={
                  snapshot.services.worker === "ok"
                    ? "emerald"
                    : snapshot.services.worker === "stale"
                      ? "amber"
                      : "red"
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card className="bg-brand-surface border-brand-border">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-brand-border/60 p-1.5">
                  <Boxes className="h-4 w-4 text-brand-text" />
                </div>
                <h2 className="text-brand-text font-semibold">Filas</h2>
              </div>
              <span className="rounded-full border border-brand-border px-2 py-0.5 text-[11px] text-brand-muted">
                visão operacional
              </span>
            </div>
            <p className="mt-2 text-xs text-brand-muted">
              Acompanhamento rápido de backlog por origem, com DLQ por integração.
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {queueItems.map((item) => {
                const barWidth = Math.max(8, Math.round((item.value / maxQueueValue) * 100));
                return (
                  <div key={item.label} className="rounded-lg border border-brand-border/70 bg-brand-surface/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="inline-flex items-center gap-1 text-xs font-semibold text-brand-text">
                        {item.provider ? (
                          <ProviderBrandIcon provider={item.provider} className="h-3.5 w-3.5 rounded" />
                        ) : null}
                        {item.label}
                      </p>
                      <p className="text-xs text-brand-muted">DLQ {item.dlq}</p>
                    </div>
                    <p className="mt-1 text-lg font-semibold text-brand-text">{item.value}</p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-brand-border/50">
                      <div
                        className="h-1.5 rounded-full bg-brand-primary/80"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-brand-surface border-brand-border">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-brand-border/60 p-1.5">
                  <Workflow className="h-4 w-4 text-brand-text" />
                </div>
                <h2 className="text-brand-text font-semibold">Erros recentes</h2>
              </div>
              <span className="rounded-full border border-brand-border px-2 py-0.5 text-[11px] text-brand-muted">
                {snapshot.errors.length} itens
              </span>
            </div>
            <p className="mt-2 text-xs text-brand-muted">
              Falhas mais novas de processamento e integrações para triagem rápida.
            </p>
            {snapshot.errors.length === 0 ? (
              <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-600 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Sem erros recentes.</span>
                </div>
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {snapshot.errors.slice(0, 6).map((item, idx) => (
                  <li
                    key={`${item.source}-${idx}`}
                    className="rounded-lg border border-brand-border/80 bg-brand-surface/40 p-3"
                  >
                    <p className="text-xs text-brand-muted flex items-center gap-2">
                      {item.source === "worker" ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <TriangleAlert className="h-3.5 w-3.5 text-red-500" />
                      )}
                      {item.source} • {new Date(item.occurredAt).toLocaleString("pt-BR")}
                    </p>
                    <p className="mt-1 text-sm text-brand-text line-clamp-2">{item.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="bg-brand-surface border-brand-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-brand-border/60 p-1.5">
                <Workflow className="h-4 w-4 text-brand-text" />
              </div>
              <h2 className="text-brand-text font-semibold">Métricas do agente IA</h2>
            </div>
            <p className="mt-2 text-xs text-brand-muted">
              Indicadores operacionais para consultoria comercial e acompanhamento de execução.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-brand-border p-3">
                <p className="text-xs text-brand-muted">Classificações (24h)</p>
                <p className="mt-1 text-xl font-semibold text-brand-text">
                  {snapshot.agentMetrics.classificationsLast24h}
                </p>
              </div>
              <div className="rounded-lg border border-brand-border p-3">
                <p className="text-xs text-brand-muted">Follow-ups pendentes</p>
                <p className="mt-1 text-xl font-semibold text-brand-text">
                  {snapshot.agentMetrics.pendingFollowups}
                </p>
              </div>
              <div className="rounded-lg border border-brand-border p-3">
                <p className="text-xs text-brand-muted">Notificações não lidas</p>
                <p className="mt-1 text-xl font-semibold text-brand-text">
                  {snapshot.agentMetrics.unreadNotifications}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card className="bg-brand-surface border-brand-border">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ProviderBrandIcon provider="evolution" className="h-4 w-4 rounded" />
                <h2 className="text-brand-text font-semibold">Evolution</h2>
              </div>
              <span className="rounded-full border border-brand-border px-2 py-0.5 text-[11px] text-brand-muted">
                {snapshot.integrations.evolution.length} instâncias
              </span>
            </div>
            {evolutionByTenant.length === 0 ? (
              <p className="mt-3 text-sm text-brand-muted">Nenhuma instância cadastrada.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {evolutionByTenant.map((group) => (
                  <div key={group.tenantId} className="rounded-lg border border-brand-border p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">
                      Cliente: {group.tenantName}
                    </p>
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <li key={item.instanceId} className="rounded-md border border-brand-border/70 p-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-brand-muted">
                              {item.details?.externalId ?? item.instanceId}
                            </span>
                            <span className={statusBadge(item.status)}>
                              {statusLabel(item.status)} ({item.latencyMs}ms)
                            </span>
                          </div>
                          <ObservabilityStatusDiagnosticModal
                            provider="evolution"
                            instanceId={item.instanceId}
                            details={item.details}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-brand-surface border-brand-border">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ProviderBrandIcon provider="uazapi" className="h-4 w-4 rounded" />
                <h2 className="text-brand-text font-semibold">UAZAPI</h2>
              </div>
              <span className="rounded-full border border-brand-border px-2 py-0.5 text-[11px] text-brand-muted">
                {snapshot.integrations.uazapi.length} instâncias
              </span>
            </div>
            {uazapiByTenant.length === 0 ? (
              <p className="mt-3 text-sm text-brand-muted">Nenhuma instância cadastrada.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {uazapiByTenant.map((group) => (
                  <div key={group.tenantId} className="rounded-lg border border-brand-border p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">
                      Cliente: {group.tenantName}
                    </p>
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <li key={item.instanceId} className="rounded-md border border-brand-border/70 p-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-brand-muted">
                              {item.details?.externalId ?? item.instanceId}
                            </span>
                            <span className={statusBadge(item.status)}>
                              {statusLabel(item.status)} ({item.latencyMs}ms)
                            </span>
                          </div>
                          <ObservabilityStatusDiagnosticModal
                            provider="uazapi"
                            instanceId={item.instanceId}
                            details={item.details}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="bg-brand-surface border-brand-border">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-brand-muted" />
                <h2 className="text-brand-text font-semibold">Últimos eventos webhook (geral)</h2>
              </div>
              <span className="rounded-full border border-brand-border px-2 py-0.5 text-[11px] text-brand-muted">
                {snapshot.recentWebhookEvents.length} eventos
              </span>
            </div>
            <p className="mt-1 text-sm text-brand-muted">
              Lista unificada dos eventos recebidos via webhook por provedor, com identificação da origem
              e status de processamento.
            </p>
            {snapshot.recentWebhookEvents.length === 0 ? (
              <p className="mt-3 text-sm text-brand-muted">
                Nenhum evento recebido ainda. Verifique URLs de webhook e eventos habilitados nos provedores.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {snapshot.recentWebhookEvents.map((ev) => (
                  <li
                    key={`${ev.source}-${ev.id}`}
                    className="rounded-lg border border-brand-border p-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-brand-text">{ev.eventType}</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-brand-border px-2 py-0.5 text-[11px] text-brand-muted">
                          {ev.source === "evolution" ? (
                            <ProviderBrandIcon provider="evolution" className="h-3.5 w-3.5 rounded" />
                          ) : ev.source === "uazapi" ? (
                            <ProviderBrandIcon provider="uazapi" className="h-3.5 w-3.5 rounded" />
                          ) : ev.source === "typebot" ? (
                            <ProviderBrandIcon provider="typebot" className="h-3.5 w-3.5 rounded" />
                          ) : null}
                          {webhookSourceLabel(ev.source)}
                        </span>
                      </div>
                      <span className="text-xs text-brand-muted">
                        {new Date(ev.receivedAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="mt-1 grid grid-cols-1 gap-1 text-xs text-brand-muted sm:grid-cols-2">
                      <p>Cliente: {ev.tenantName}</p>
                      <p>Origem: {ev.originName}</p>
                      <p className="truncate" title={ev.originId}>ID origem: {ev.originId}</p>
                      <p className="truncate" title={ev.externalEventId ?? "—"}>
                        Event ID externo: {ev.externalEventId ?? "—"}
                      </p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {webhookStatus(ev) === "processado" ? (
                        <span className="text-emerald-600 dark:text-emerald-300">Processado</span>
                      ) : webhookStatus(ev) === "erro" ? (
                        <span className="text-red-600 dark:text-red-300">Erro</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-300">Pendente</span>
                      )}
                      {ev.processedAt && (
                        <span className="text-brand-muted">
                          em {new Date(ev.processedAt).toLocaleString("pt-BR")}
                        </span>
                      )}
                      {ev.processingError && (
                        <span className="text-red-600 dark:text-red-300" title={ev.processingError}>
                          Erro: {ev.processingError.slice(0, 60)}
                          {ev.processingError.length > 60 ? "…" : ""}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </PageSection>
  );
}
