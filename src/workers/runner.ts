/**
 * Worker: Redis, heartbeat e consumidores das filas Typebot, Evolution e Google Ads sync.
 * Uso: npm run worker:dev
 */
import "dotenv/config";
import Redis from "ioredis";
import { HEARTBEAT_KEY, MAX_AGE_MS } from "./readiness";
import {
  dequeue,
  QUEUE_RAW_TYPEBOT,
  QUEUE_RAW_EVOLUTION,
  QUEUE_RAW_UAZAPI,
  QUEUE_SYNC_GOOGLE_ADS,
  QUEUE_SYNC_META_ADS,
  QUEUE_SYNC_CLARITY,
  QUEUE_AI_CLASSIFICATION,
  QUEUE_FOLLOWUP_DUE_TENANT,
  DLQ_RAW_TYPEBOT,
  DLQ_RAW_EVOLUTION,
  DLQ_RAW_UAZAPI,
  DLQ_SYNC_GOOGLE_ADS,
  DLQ_SYNC_META_ADS,
  DLQ_SYNC_CLARITY,
  DLQ_AI_CLASSIFICATION,
  DLQ_FOLLOWUP_DUE_TENANT,
  enqueue,
} from "./queue";
import { processTypebotRaw } from "./processors/typebot";
import { processEvolutionRaw } from "./processors/evolution";
import { processUazapiRaw } from "./processors/uazapi";
import { processClassifyConversation } from "./processors/classify-conversation";
import { processDueFollowupsTenantJob } from "./processors/process-due-followups";
import { runSyncForAccount } from "@/server/integrations/google-ads";
import { runMetaSyncForAccount } from "@/server/integrations/meta-ads";
import { runClaritySyncForConnection } from "@/server/integrations/clarity/run-sync";
import { cleanupExpiredAuthArtifacts } from "@/server/auth/cleanup";
import type {
  JobPayload,
  JobProcessTypebotRaw,
  JobProcessEvolutionRaw,
  JobProcessUazapiRaw,
  JobSyncGoogleAdsAccount,
  JobSyncMetaAdsAccount,
  JobSyncClarityConnection,
  JobClassifyConversation,
  JobProcessDueFollowupsTenant,
} from "./queue/types";

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.error("REDIS_URL não definida.");
  process.exit(1);
}

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
const MAX_ATTEMPTS = 5;

async function pushToDlq(queueName: string, job: JobPayload, error: string) {
  const payload = JSON.stringify({
    failedAt: new Date().toISOString(),
    error,
    job,
  });
  await redis.lpush(queueName, payload);
}

async function retryJob(
  job: JobPayload,
  queueName: string,
  deadLetterQueue: string,
  error: string
) {
  const currentAttempt = (job.attempt ?? 0) + 1;
  if (currentAttempt >= MAX_ATTEMPTS) {
    await pushToDlq(deadLetterQueue, { ...job, attempt: currentAttempt }, error);
    return;
  }
  const backoffMs = Math.min(30_000, currentAttempt * 2_000);
  setTimeout(() => {
    enqueue(redis, { ...job, attempt: currentAttempt }).catch((err) => {
      console.error("[worker] enqueue retry failed", { queueName, err });
    });
  }, backoffMs);
}

function writeHeartbeat(): void {
  redis.set(HEARTBEAT_KEY, Date.now().toString(), "PX", MAX_AGE_MS).catch((err) => {
    console.error("Heartbeat write failed:", err);
  });
}

const heartbeatInterval = setInterval(writeHeartbeat, 10_000);
writeHeartbeat();

const authCleanupInterval = setInterval(() => {
  cleanupExpiredAuthArtifacts()
    .then((result) => {
      if (result.sessionsDeleted > 0 || result.passwordResetTokensDeleted > 0) {
        console.log("[auth-cleanup] expired records removed", result);
      }
    })
    .catch((err) => {
      console.error("[auth-cleanup] failed", err);
    });
}, 15 * 60 * 1000);

async function runTypebotConsumer(): Promise<void> {
  const job = await dequeue(redis, QUEUE_RAW_TYPEBOT, 5);
  if (!job) return;
  if (job.type !== "process_typebot_raw") return;
  const result = await processTypebotRaw(job);
  if ("error" in result) {
    console.error("[typebot] processing failed", {
      rawEventId: job.rawEventId,
      error: result.error,
    });
    await retryJob(
      job as JobProcessTypebotRaw,
      QUEUE_RAW_TYPEBOT,
      DLQ_RAW_TYPEBOT,
      result.error
    );
  } else {
    console.log("[typebot] processed", { rawEventId: job.rawEventId });
  }
}

async function runEvolutionConsumer(): Promise<void> {
  const job = await dequeue(redis, QUEUE_RAW_EVOLUTION, 5);
  if (!job) return;
  if (job.type !== "process_evolution_raw") return;
  const result = await processEvolutionRaw(job);
  if ("error" in result) {
    console.error("[evolution] processing failed", {
      rawEventId: job.rawEventId,
      error: result.error,
    });
    await retryJob(
      job as JobProcessEvolutionRaw,
      QUEUE_RAW_EVOLUTION,
      DLQ_RAW_EVOLUTION,
      result.error
    );
  } else {
    console.log("[evolution] processed", { rawEventId: job.rawEventId });
  }
}

function loopTypebot(): void {
  runTypebotConsumer()
    .catch((err) => {
      console.error("[typebot] consumer error", err);
    })
    .then(() => {
      setImmediate(loopTypebot);
    });
}

function loopEvolution(): void {
  runEvolutionConsumer()
    .catch((err) => {
      console.error("[evolution] consumer error", err);
    })
    .then(() => {
      setImmediate(loopEvolution);
    });
}

async function runUazapiConsumer(): Promise<void> {
  const job = await dequeue(redis, QUEUE_RAW_UAZAPI, 5);
  if (!job) return;
  if (job.type !== "process_uazapi_raw") return;
  const result = await processUazapiRaw(job);
  if ("error" in result) {
    console.error("[uazapi] processing failed", {
      rawEventId: job.rawEventId,
      error: result.error,
    });
    await retryJob(
      job as JobProcessUazapiRaw,
      QUEUE_RAW_UAZAPI,
      DLQ_RAW_UAZAPI,
      result.error
    );
  } else {
    console.log("[uazapi] processed", { rawEventId: job.rawEventId });
  }
}

function loopUazapi(): void {
  runUazapiConsumer()
    .catch((err) => {
      console.error("[uazapi] consumer error", err);
    })
    .then(() => {
      setImmediate(loopUazapi);
    });
}

async function runGoogleAdsSyncConsumer(): Promise<void> {
  const job = await dequeue(redis, QUEUE_SYNC_GOOGLE_ADS, 5);
  if (!job) return;
  if (job.type !== "sync_google_ads_account") return;
  const result = await runSyncForAccount(job.accountId);
  if (result.ok) {
    console.log("[google-ads] sync ok", { accountId: job.accountId, logId: result.logId });
  } else {
    console.error("[google-ads] sync failed", {
      accountId: job.accountId,
      error: result.error,
      logId: result.logId,
    });
    await retryJob(
      job as JobSyncGoogleAdsAccount,
      QUEUE_SYNC_GOOGLE_ADS,
      DLQ_SYNC_GOOGLE_ADS,
      result.error
    );
  }
}

async function runMetaAdsSyncConsumer(): Promise<void> {
  const job = await dequeue(redis, QUEUE_SYNC_META_ADS, 5);
  if (!job) return;
  if (job.type !== "sync_meta_ads_account") return;
  const result = await runMetaSyncForAccount(job.accountId);
  if (result.ok) {
    console.log("[meta-ads] sync ok", { accountId: job.accountId, logId: result.logId });
  } else {
    console.error("[meta-ads] sync failed", {
      accountId: job.accountId,
      error: result.error,
      logId: result.logId,
    });
    await retryJob(
      job as JobSyncMetaAdsAccount,
      QUEUE_SYNC_META_ADS,
      DLQ_SYNC_META_ADS,
      result.error
    );
  }
}

async function runClaritySyncConsumer(): Promise<void> {
  const job = await dequeue(redis, QUEUE_SYNC_CLARITY, 5);
  if (!job) return;
  if (job.type !== "sync_clarity_connection") return;
  const result = await runClaritySyncForConnection(job.connectionId);
  if (result.ok) {
    console.log("[clarity] sync ok", { connectionId: job.connectionId });
  } else {
    console.error("[clarity] sync failed", {
      connectionId: job.connectionId,
      error: result.error,
    });
    await retryJob(
      job as JobSyncClarityConnection,
      QUEUE_SYNC_CLARITY,
      DLQ_SYNC_CLARITY,
      result.error
    );
  }
}

async function runAiClassificationConsumer(): Promise<void> {
  const job = await dequeue(redis, QUEUE_AI_CLASSIFICATION, 5);
  if (!job) return;
  if (job.type !== "classify_conversation") return;
  const result = await processClassifyConversation(job);
  if ("error" in result) {
    console.error("[ai] classification failed", {
      conversationId: job.conversationId,
      error: result.error,
    });
    await retryJob(
      job as JobClassifyConversation,
      QUEUE_AI_CLASSIFICATION,
      DLQ_AI_CLASSIFICATION,
      result.error
    );
  } else {
    console.log("[ai] conversation classified", { conversationId: job.conversationId });
  }
}

function loopGoogleAdsSync(): void {
  runGoogleAdsSyncConsumer()
    .catch((err) => {
      console.error("[google-ads] consumer error", err);
    })
    .then(() => {
      setImmediate(loopGoogleAdsSync);
    });
}

function loopMetaAdsSync(): void {
  runMetaAdsSyncConsumer()
    .catch((err) => {
      console.error("[meta-ads] consumer error", err);
    })
    .then(() => {
      setImmediate(loopMetaAdsSync);
    });
}

function loopClaritySync(): void {
  runClaritySyncConsumer()
    .catch((err) => {
      console.error("[clarity] consumer error", err);
    })
    .then(() => {
      setImmediate(loopClaritySync);
    });
}

function loopAiClassification(): void {
  runAiClassificationConsumer()
    .catch((err) => {
      console.error("[ai] consumer error", err);
    })
    .then(() => {
      setImmediate(loopAiClassification);
    });
}

async function runDueFollowupsConsumer(): Promise<void> {
  const job = await dequeue(redis, QUEUE_FOLLOWUP_DUE_TENANT, 5);
  if (!job) return;
  if (job.type !== "process_due_followups_tenant") return;
  const result = await processDueFollowupsTenantJob(job as JobProcessDueFollowupsTenant);
  if ("error" in result) {
    console.error("[followup] due processing failed", {
      tenantId: job.tenantId,
      error: result.error,
    });
    await retryJob(
      job as JobProcessDueFollowupsTenant,
      QUEUE_FOLLOWUP_DUE_TENANT,
      DLQ_FOLLOWUP_DUE_TENANT,
      result.error
    );
  } else {
    console.log("[followup] due processing done", { tenantId: job.tenantId });
  }
}

function loopDueFollowups(): void {
  runDueFollowupsConsumer()
    .catch((err) => {
      console.error("[followup] consumer error", err);
    })
    .then(() => {
      setImmediate(loopDueFollowups);
    });
}

redis.on("connect", () => {
  console.log(
    "Worker: Redis conectado; heartbeat e filas typebot/evolution/uazapi/google-ads/meta-ads/clarity/ai/followup ativos."
  );
  loopTypebot();
  loopEvolution();
  loopUazapi();
  loopGoogleAdsSync();
  loopMetaAdsSync();
  loopClaritySync();
  loopAiClassification();
  loopDueFollowups();
});

redis.on("error", (err) => {
  console.error("Worker: Redis error", err);
});

process.on("SIGINT", () => {
  clearInterval(heartbeatInterval);
  clearInterval(authCleanupInterval);
  redis.quit().then(() => process.exit(0));
});

process.on("SIGTERM", () => {
  clearInterval(heartbeatInterval);
  clearInterval(authCleanupInterval);
  redis.quit().then(() => process.exit(0));
});
