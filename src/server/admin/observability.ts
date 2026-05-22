import { desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  evolutionWebhookEvents,
  uazapiWebhookEvents,
  typebotWebhookEvents,
  processingFailures,
  tenants,
  evolutionInstances,
  uazapiInstances,
  typebotBots,
  aiClassifications,
  followupTasks,
  internalNotifications,
} from "@/db/schema";
import { createRedisClient } from "@/server/redis";
import {
  HEARTBEAT_KEY,
  MAX_AGE_MS,
} from "@/workers/readiness";
import {
  QUEUE_RAW_EVOLUTION,
  QUEUE_RAW_TYPEBOT,
  QUEUE_RAW_UAZAPI,
  QUEUE_SYNC_GOOGLE_ADS,
  QUEUE_SYNC_META_ADS,
  QUEUE_SYNC_CLARITY,
  QUEUE_AI_CLASSIFICATION,
  QUEUE_FOLLOWUP_DUE_TENANT,
  DLQ_RAW_EVOLUTION,
  DLQ_RAW_TYPEBOT,
  DLQ_RAW_UAZAPI,
  DLQ_SYNC_GOOGLE_ADS,
  DLQ_SYNC_META_ADS,
  DLQ_SYNC_CLARITY,
  DLQ_AI_CLASSIFICATION,
  DLQ_FOLLOWUP_DUE_TENANT,
} from "@/workers/queue";
import { providerRegistry } from "@/server/integrations/providers/registry";
import type { ProviderStatusDetails } from "@/server/integrations/providers/types";

/** Garante JSON puro (sem Date/BigInt) para serialização RSC → Client Components. */
function cloneJsonForFlight<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface ObservabilitySnapshot {
  generatedAt: string;
  services: {
    api: "ok";
    db: "ok" | "error";
    redis: "ok" | "error";
    worker: "ok" | "stale" | "missing";
  };
  serviceDetails: {
    api: {
      summary: string;
      checkedAt: string;
    };
    db: {
      summary: string;
      checkedAt: string;
      probe: string;
    };
    redis: {
      summary: string;
      queueDepthTotal: number;
      dlqDepthTotal: number;
    };
    worker: {
      summary: string;
      backlogTotal: number;
      lastHeartbeatAt: string | null;
      heartbeatAgeMs: number | null;
    };
  };
  serviceVisuals: {
    api: number[];
    db: number[];
    redis: number[];
    worker: number[];
    labels: string[];
  };
  queue: {
    typebotDepth: number;
    evolutionDepth: number;
    uazapiDepth: number;
    googleAdsDepth: number;
    metaAdsDepth: number;
    clarityDepth: number;
    aiClassificationDepth: number;
    followupDueDepth: number;
    typebotDlqDepth: number;
    evolutionDlqDepth: number;
    uazapiDlqDepth: number;
    googleAdsDlqDepth: number;
    metaAdsDlqDepth: number;
    clarityDlqDepth: number;
    aiClassificationDlqDepth: number;
    followupDueDlqDepth: number;
  };
  integrations: {
    evolution: Array<{
      instanceId: string;
      tenantId: string;
      tenantName: string;
      provider: "evolution";
      ok: boolean;
      status: string;
      latencyMs: number;
      details?: ProviderStatusDetails;
    }>;
    uazapi: Array<{
      instanceId: string;
      tenantId: string;
      tenantName: string;
      provider: "uazapi";
      ok: boolean;
      status: string;
      latencyMs: number;
      details?: ProviderStatusDetails;
    }>;
  };
  errors: Array<{
    source: string;
    message: string;
    occurredAt: string;
  }>;
  recentWebhookEvents: Array<{
    id: string;
    source: "evolution" | "uazapi" | "typebot";
    tenantId: string;
    tenantName: string;
    originId: string;
    originName: string;
    externalEventId: string | null;
    eventType: string;
    receivedAt: string;
    processedAt: string | null;
    processingError: string | null;
  }>;
  agentMetrics: {
    classificationsLast24h: number;
    pendingFollowups: number;
    unreadNotifications: number;
  };
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function buildLastTimeBuckets(totalBuckets: number, bucketMinutes: number) {
  const now = Date.now();
  const bucketMs = bucketMinutes * 60 * 1000;
  const start = now - totalBuckets * bucketMs;
  return Array.from({ length: totalBuckets }, (_, idx) => {
    const bucketStart = start + idx * bucketMs;
    return {
      index: idx,
      from: bucketStart,
      to: bucketStart + bucketMs,
      label: new Date(bucketStart).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  });
}

function resolveBucketIndex(
  timestampMs: number,
  buckets: Array<{ from: number; to: number; index: number }>
): number {
  return buckets.findIndex((bucket) => timestampMs >= bucket.from && timestampMs < bucket.to);
}

async function getQueueMetrics() {
  if (!process.env.REDIS_URL) {
    return {
      redisOk: false,
      workerStatus: "missing" as const,
      heartbeatAgeMs: null as number | null,
      lastHeartbeatAt: null as string | null,
      queue: {
        typebotDepth: 0,
        evolutionDepth: 0,
        uazapiDepth: 0,
        googleAdsDepth: 0,
        metaAdsDepth: 0,
        clarityDepth: 0,
        aiClassificationDepth: 0,
        followupDueDepth: 0,
        typebotDlqDepth: 0,
        evolutionDlqDepth: 0,
        uazapiDlqDepth: 0,
        googleAdsDlqDepth: 0,
        metaAdsDlqDepth: 0,
        clarityDlqDepth: 0,
        aiClassificationDlqDepth: 0,
        followupDueDlqDepth: 0,
      },
    };
  }
  const redis = createRedisClient();
  try {
    const [
      typebotDepth,
      evolutionDepth,
      uazapiDepth,
      googleAdsDepth,
      metaAdsDepth,
      clarityDepth,
      aiClassificationDepth,
      followupDueDepth,
      typebotDlqDepth,
      evolutionDlqDepth,
      uazapiDlqDepth,
      googleAdsDlqDepth,
      metaAdsDlqDepth,
      clarityDlqDepth,
      aiClassificationDlqDepth,
      followupDueDlqDepth,
      workerHeartbeat,
    ] = await Promise.all([
      redis.llen(QUEUE_RAW_TYPEBOT),
      redis.llen(QUEUE_RAW_EVOLUTION),
      redis.llen(QUEUE_RAW_UAZAPI),
      redis.llen(QUEUE_SYNC_GOOGLE_ADS),
      redis.llen(QUEUE_SYNC_META_ADS),
      redis.llen(QUEUE_SYNC_CLARITY),
      redis.llen(QUEUE_AI_CLASSIFICATION),
      redis.llen(QUEUE_FOLLOWUP_DUE_TENANT),
      redis.llen(DLQ_RAW_TYPEBOT),
      redis.llen(DLQ_RAW_EVOLUTION),
      redis.llen(DLQ_RAW_UAZAPI),
      redis.llen(DLQ_SYNC_GOOGLE_ADS),
      redis.llen(DLQ_SYNC_META_ADS),
      redis.llen(DLQ_SYNC_CLARITY),
      redis.llen(DLQ_AI_CLASSIFICATION),
      redis.llen(DLQ_FOLLOWUP_DUE_TENANT),
      redis.get(HEARTBEAT_KEY),
    ]);

    const heartbeatTs = workerHeartbeat ? Number(workerHeartbeat) : NaN;
    const heartbeatAgeMs = Number.isFinite(heartbeatTs) ? Date.now() - heartbeatTs : null;
    const workerStatus =
      Number.isFinite(heartbeatTs)
        ? heartbeatAgeMs !== null && heartbeatAgeMs <= MAX_AGE_MS
          ? "ok"
          : "stale"
        : "missing";

    return {
      redisOk: true,
      workerStatus: workerStatus as "ok" | "stale" | "missing",
      heartbeatAgeMs,
      lastHeartbeatAt:
        Number.isFinite(heartbeatTs) ? new Date(heartbeatTs).toISOString() : null,
      queue: {
        typebotDepth,
        evolutionDepth,
        uazapiDepth,
        googleAdsDepth,
        metaAdsDepth,
        clarityDepth,
        aiClassificationDepth,
        followupDueDepth,
        typebotDlqDepth,
        evolutionDlqDepth,
        uazapiDlqDepth,
        googleAdsDlqDepth,
        metaAdsDlqDepth,
        clarityDlqDepth,
        aiClassificationDlqDepth,
        followupDueDlqDepth,
      },
    };
  } catch {
    return {
      redisOk: false,
      workerStatus: "missing" as const,
      heartbeatAgeMs: null as number | null,
      lastHeartbeatAt: null as string | null,
      queue: {
        typebotDepth: 0,
        evolutionDepth: 0,
        uazapiDepth: 0,
        googleAdsDepth: 0,
        metaAdsDepth: 0,
        clarityDepth: 0,
        aiClassificationDepth: 0,
        followupDueDepth: 0,
        typebotDlqDepth: 0,
        evolutionDlqDepth: 0,
        uazapiDlqDepth: 0,
        googleAdsDlqDepth: 0,
        metaAdsDlqDepth: 0,
        clarityDlqDepth: 0,
        aiClassificationDlqDepth: 0,
        followupDueDlqDepth: 0,
      },
    };
  } finally {
    redis.quit();
  }
}

async function getRecentErrors() {
  const db = getDb();
  type ErrorRow = { message: string | null; occurredAt: Date | null };
  const safeQuery = async (queryFn: () => Promise<ErrorRow[]>) => {
    try {
      return await queryFn();
    } catch {
      return [];
    }
  };
  const [typebotErrors, evolutionErrors, uazapiErrors, workerFailures] = await Promise.all([
    safeQuery(() =>
      db
        .select({
          message: typebotWebhookEvents.processingError,
          occurredAt: typebotWebhookEvents.processedAt,
        })
        .from(typebotWebhookEvents)
        .where(isNotNull(typebotWebhookEvents.processingError))
        .orderBy(desc(typebotWebhookEvents.processedAt))
        .limit(10)
    ),
    safeQuery(() =>
      db
        .select({
          message: evolutionWebhookEvents.processingError,
          occurredAt: evolutionWebhookEvents.processedAt,
        })
        .from(evolutionWebhookEvents)
        .where(isNotNull(evolutionWebhookEvents.processingError))
        .orderBy(desc(evolutionWebhookEvents.processedAt))
        .limit(10)
    ),
    safeQuery(() =>
      db
        .select({
          message: uazapiWebhookEvents.processingError,
          occurredAt: uazapiWebhookEvents.processedAt,
        })
        .from(uazapiWebhookEvents)
        .where(isNotNull(uazapiWebhookEvents.processingError))
        .orderBy(desc(uazapiWebhookEvents.processedAt))
        .limit(10)
    ),
    safeQuery(() =>
      db
        .select({
          message: processingFailures.errorMessage,
          occurredAt: processingFailures.failedAt,
        })
        .from(processingFailures)
        .orderBy(desc(processingFailures.failedAt))
        .limit(10)
    ),
  ]);

  return [
    ...typebotErrors.map((row) => ({
      source: "typebot",
      message: row.message ?? "erro sem mensagem",
      occurredAt: row.occurredAt?.toISOString() ?? new Date(0).toISOString(),
    })),
    ...evolutionErrors.map((row) => ({
      source: "evolution",
      message: row.message ?? "erro sem mensagem",
      occurredAt: row.occurredAt?.toISOString() ?? new Date(0).toISOString(),
    })),
    ...uazapiErrors.map((row) => ({
      source: "uazapi",
      message: row.message ?? "erro sem mensagem",
      occurredAt: row.occurredAt?.toISOString() ?? new Date(0).toISOString(),
    })),
    ...workerFailures.map((row) => ({
      source: "worker",
      message: row.message ?? "erro sem mensagem",
      occurredAt: row.occurredAt?.toISOString() ?? new Date(0).toISOString(),
    })),
  ]
    .sort((a, b) => (a.occurredAt > b.occurredAt ? -1 : 1))
    .slice(0, 15);
}

async function getRecentWebhookEventsGeneral() {
  const db = getDb();
  type WebhookRow = {
    id: string;
    source: "evolution" | "uazapi" | "typebot";
    tenantId: string;
    tenantName: string;
    originId: string;
    originName: string | null;
    originExternalId: string | null;
    externalEventId: string | null;
    eventType: string;
    receivedAt: Date;
    processedAt: Date | null;
    processingError: string | null;
  };
  const safeQuery = async (queryFn: () => Promise<WebhookRow[]>) => {
    try {
      return await queryFn();
    } catch {
      return [];
    }
  };

  const [evolutionRows, uazapiRows, typebotRows] = await Promise.all([
    safeQuery(() =>
      db
        .select({
          id: evolutionWebhookEvents.id,
          source: sql<"evolution">`'evolution'`,
          tenantId: evolutionWebhookEvents.tenantId,
          tenantName: tenants.name,
          originId: evolutionWebhookEvents.evolutionInstanceId,
          originName: evolutionInstances.instanceName,
          originExternalId: evolutionInstances.externalId,
          externalEventId: evolutionWebhookEvents.externalEventId,
          eventType: evolutionWebhookEvents.eventType,
          receivedAt: evolutionWebhookEvents.receivedAt,
          processedAt: evolutionWebhookEvents.processedAt,
          processingError: evolutionWebhookEvents.processingError,
        })
        .from(evolutionWebhookEvents)
        .innerJoin(
          evolutionInstances,
          eq(evolutionWebhookEvents.evolutionInstanceId, evolutionInstances.id)
        )
        .innerJoin(tenants, eq(evolutionWebhookEvents.tenantId, tenants.id))
        .orderBy(desc(evolutionWebhookEvents.receivedAt))
        .limit(20)
    ),
    safeQuery(() =>
      db
        .select({
          id: uazapiWebhookEvents.id,
          source: sql<"uazapi">`'uazapi'`,
          tenantId: uazapiWebhookEvents.tenantId,
          tenantName: tenants.name,
          originId: uazapiWebhookEvents.uazapiInstanceId,
          originName: uazapiInstances.instanceName,
          originExternalId: uazapiInstances.externalId,
          externalEventId: uazapiWebhookEvents.externalEventId,
          eventType: uazapiWebhookEvents.eventType,
          receivedAt: uazapiWebhookEvents.receivedAt,
          processedAt: uazapiWebhookEvents.processedAt,
          processingError: uazapiWebhookEvents.processingError,
        })
        .from(uazapiWebhookEvents)
        .innerJoin(uazapiInstances, eq(uazapiWebhookEvents.uazapiInstanceId, uazapiInstances.id))
        .innerJoin(tenants, eq(uazapiWebhookEvents.tenantId, tenants.id))
        .orderBy(desc(uazapiWebhookEvents.receivedAt))
        .limit(20)
    ),
    safeQuery(() =>
      db
        .select({
          id: typebotWebhookEvents.id,
          source: sql<"typebot">`'typebot'`,
          tenantId: typebotWebhookEvents.tenantId,
          tenantName: tenants.name,
          originId: typebotWebhookEvents.typebotBotId,
          originName: typebotBots.name,
          originExternalId: typebotBots.externalId,
          externalEventId: typebotWebhookEvents.externalEventId,
          eventType: sql<string>`'webhook'`,
          receivedAt: typebotWebhookEvents.receivedAt,
          processedAt: typebotWebhookEvents.processedAt,
          processingError: typebotWebhookEvents.processingError,
        })
        .from(typebotWebhookEvents)
        .innerJoin(typebotBots, eq(typebotWebhookEvents.typebotBotId, typebotBots.id))
        .innerJoin(tenants, eq(typebotWebhookEvents.tenantId, tenants.id))
        .orderBy(desc(typebotWebhookEvents.receivedAt))
        .limit(20)
    ),
  ]);

  return [...evolutionRows, ...uazapiRows, ...typebotRows]
    .sort((a, b) => (a.receivedAt > b.receivedAt ? -1 : 1))
    .slice(0, 30)
    .map((row) => ({
      id: row.id,
      source: row.source,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      originId: row.originId,
      originName: row.originName?.trim() || row.originExternalId || row.originId,
      externalEventId: row.externalEventId ?? null,
      eventType: row.eventType,
      receivedAt: row.receivedAt.toISOString(),
      processedAt: row.processedAt?.toISOString() ?? null,
      processingError: row.processingError ?? null,
    }));
}

export async function getObservabilitySnapshot(): Promise<ObservabilitySnapshot> {
  const db = getDb();

  let dbStatus: "ok" | "error" = "ok";
  try {
    await db.execute(sql`select 1`);
  } catch {
    dbStatus = "error";
  }

  const [
    queueData,
    providerStatuses,
    errors,
    recentWebhookEvents,
    agentMetrics,
  ] = await Promise.all([
    getQueueMetrics(),
    Promise.all(providerRegistry.map((provider) => provider.fetchStatuses())),
    getRecentErrors(),
    getRecentWebhookEventsGeneral(),
    (async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const safeCount = async (queryFn: () => Promise<{ count: number }[]>) => {
        try {
          const rows = await queryFn();
          return Number(rows[0]?.count ?? 0);
        } catch {
          return 0;
        }
      };
      const [classificationsLast24h, pendingFollowups, unreadNotifications] = await Promise.all([
        safeCount(() =>
          db
            .select({ count: sql<number>`count(*)` })
            .from(aiClassifications)
            .where(
              sql`${aiClassifications.processedAt} >= ${since} and ${aiClassifications.isCurrent} = true`
            )
        ),
        safeCount(() =>
          db
            .select({ count: sql<number>`count(*)` })
            .from(followupTasks)
            .where(eq(followupTasks.status, "pending"))
        ),
        safeCount(() =>
          db
            .select({ count: sql<number>`count(*)` })
            .from(internalNotifications)
            .where(eq(internalNotifications.isRead, false))
        ),
      ]);
      return {
        classificationsLast24h,
        pendingFollowups,
        unreadNotifications,
      };
    })(),
  ]);

  const flattenedStatuses = providerStatuses.flat();
  const tenantIds = Array.from(new Set(flattenedStatuses.map((item) => item.tenantId)));
  const tenantRows =
    tenantIds.length > 0
      ? await db
          .select({ id: tenants.id, name: tenants.name })
          .from(tenants)
          .where(inArray(tenants.id, tenantIds))
      : [];
  const tenantNameById = new Map(tenantRows.map((row) => [row.id, row.name]));
  const evolutionStatuses = flattenedStatuses
    .filter((item) => item.provider === "evolution")
    .map((item) => ({
      instanceId: item.resourceId,
      tenantId: item.tenantId,
      tenantName: tenantNameById.get(item.tenantId) ?? item.tenantId,
      provider: "evolution" as const,
      ok: item.ok,
      status: item.status,
      latencyMs: item.latencyMs,
      details: item.details,
    }));
  const uazapiStatuses = flattenedStatuses
    .filter((item) => item.provider === "uazapi")
    .map((item) => ({
      instanceId: item.resourceId,
      tenantId: item.tenantId,
      tenantName: tenantNameById.get(item.tenantId) ?? item.tenantId,
      provider: "uazapi" as const,
      ok: item.ok,
      status: item.status,
      latencyMs: item.latencyMs,
      details: item.details,
    }));

  const queueDepthTotal =
    queueData.queue.typebotDepth +
    queueData.queue.evolutionDepth +
    queueData.queue.uazapiDepth +
    queueData.queue.googleAdsDepth +
    queueData.queue.metaAdsDepth +
    queueData.queue.clarityDepth +
    queueData.queue.aiClassificationDepth +
    queueData.queue.followupDueDepth;
  const dlqDepthTotal =
    queueData.queue.typebotDlqDepth +
    queueData.queue.evolutionDlqDepth +
    queueData.queue.uazapiDlqDepth +
    queueData.queue.googleAdsDlqDepth +
    queueData.queue.metaAdsDlqDepth +
    queueData.queue.clarityDlqDepth +
    queueData.queue.aiClassificationDlqDepth +
    queueData.queue.followupDueDlqDepth;

  const buckets = buildLastTimeBuckets(6, 10);
  const apiIngressByBucket = Array.from({ length: buckets.length }, () => 0);
  const dbProcessedByBucket = Array.from({ length: buckets.length }, () => 0);
  const redisPendingByBucket = Array.from({ length: buckets.length }, () => 0);
  const workerFailuresByBucket = Array.from({ length: buckets.length }, () => 0);

  for (const event of recentWebhookEvents) {
    const receivedMs = new Date(event.receivedAt).getTime();
    const receiveBucket = resolveBucketIndex(receivedMs, buckets);
    if (receiveBucket >= 0) {
      apiIngressByBucket[receiveBucket] += 1;
      if (!event.processedAt) {
        redisPendingByBucket[receiveBucket] += 1;
      }
    }
    if (event.processedAt) {
      const processedMs = new Date(event.processedAt).getTime();
      const processedBucket = resolveBucketIndex(processedMs, buckets);
      if (processedBucket >= 0) {
        dbProcessedByBucket[processedBucket] += 1;
      }
    }
  }

  for (const error of errors) {
    if (error.source !== "worker") continue;
    const occurredMs = new Date(error.occurredAt).getTime();
    const errorBucket = resolveBucketIndex(occurredMs, buckets);
    if (errorBucket >= 0) {
      workerFailuresByBucket[errorBucket] += 1;
    }
  }

  const maxIngress = Math.max(...apiIngressByBucket, 1);
  const maxProcessed = Math.max(...dbProcessedByBucket, 1);
  const maxPending = Math.max(...redisPendingByBucket, 1);
  const maxWorkerFailure = Math.max(...workerFailuresByBucket, 1);
  const baseWorkerScore =
    queueData.workerStatus === "ok" ? 100 : queueData.workerStatus === "stale" ? 55 : 25;

  const serviceVisuals = {
    api: apiIngressByBucket.map((value) => clampPercent((value / maxIngress) * 100)),
    db: dbProcessedByBucket.map((value) => clampPercent((value / maxProcessed) * 100)),
    redis: redisPendingByBucket.map((value) => clampPercent(100 - (value / maxPending) * 100)),
    worker: workerFailuresByBucket.map((value) => {
      const penalty = (value / maxWorkerFailure) * 60;
      return clampPercent(baseWorkerScore - penalty);
    }),
    labels: buckets.map((bucket) => bucket.label),
  };

  const snapshot: ObservabilitySnapshot = {
    generatedAt: new Date().toISOString(),
    services: {
      api: "ok",
      db: dbStatus,
      redis: queueData.redisOk ? "ok" : "error",
      worker: queueData.workerStatus,
    },
    serviceDetails: {
      api: {
        summary: "Aplicação respondendo normalmente.",
        checkedAt: new Date().toISOString(),
      },
      db: {
        summary:
          dbStatus === "ok"
            ? "Probe SELECT 1 executado com sucesso."
            : "Falha no probe de conectividade ao banco.",
        checkedAt: new Date().toISOString(),
        probe: "SELECT 1",
      },
      redis: {
        summary: queueData.redisOk
          ? "Redis conectado e filas acessíveis."
          : "Redis indisponível para leitura de filas.",
        queueDepthTotal,
        dlqDepthTotal,
      },
      worker: {
        summary:
          queueData.workerStatus === "ok"
            ? "Heartbeat recente detectado."
            : queueData.workerStatus === "stale"
              ? "Worker sem heartbeat recente."
              : "Worker sem heartbeat publicado.",
        backlogTotal: queueDepthTotal,
        lastHeartbeatAt: queueData.lastHeartbeatAt,
        heartbeatAgeMs: queueData.heartbeatAgeMs,
      },
    },
    serviceVisuals,
    queue: queueData.queue,
    integrations: cloneJsonForFlight({
      evolution: evolutionStatuses,
      uazapi: uazapiStatuses,
    }),
    errors,
    recentWebhookEvents,
    agentMetrics,
  };

  return snapshot;
}
