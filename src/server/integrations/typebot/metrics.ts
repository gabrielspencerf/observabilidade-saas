import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/server/db";
import { botMetricsSnapshots, typebotBots } from "@/db/schema";
import { getTypebotBotCredentials } from "./credentials";

interface TypebotMetricsResponse {
  sessionsStarted?: number;
  sessionsCompleted?: number;
  sessionsAbandoned?: number;
  stepMetrics?: Record<string, unknown>;
}

export interface TypebotMetricsSyncResult {
  botId: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  sessionsStarted: number;
  sessionsCompleted: number;
  sessionsAbandoned: number;
}

async function fetchTypebotMetrics(args: {
  botExternalId: string;
  apiBaseUrl: string;
  apiToken: string;
  from: string;
  to: string;
}): Promise<TypebotMetricsResponse> {
  const url = new URL(`${args.apiBaseUrl.replace(/\/$/, "")}/v1/bots/${args.botExternalId}/metrics`);
  url.searchParams.set("from", args.from);
  url.searchParams.set("to", args.to);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${args.apiToken}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Typebot API retornou ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  return {
    sessionsStarted: Number(data.sessionsStarted ?? data.started ?? 0),
    sessionsCompleted: Number(data.sessionsCompleted ?? data.completed ?? 0),
    sessionsAbandoned: Number(data.sessionsAbandoned ?? data.abandoned ?? 0),
    stepMetrics:
      data.stepMetrics && typeof data.stepMetrics === "object"
        ? (data.stepMetrics as Record<string, unknown>)
        : undefined,
  };
}

function toDateOnly(input: Date): string {
  return input.toISOString().slice(0, 10);
}

export async function syncTypebotMetricsForBot(args: {
  typebotBotId: string;
  from?: Date;
  to?: Date;
}): Promise<TypebotMetricsSyncResult> {
  const db = getDb();
  const [bot] = await db
    .select({
      id: typebotBots.id,
      tenantId: typebotBots.tenantId,
      externalId: typebotBots.externalId,
    })
    .from(typebotBots)
    .where(eq(typebotBots.id, args.typebotBotId))
    .limit(1);

  if (!bot) {
    throw new Error("Bot Typebot não encontrado.");
  }

  const credentials = await getTypebotBotCredentials(bot.id);
  const apiToken = credentials?.apiToken?.trim() || "";
  const apiBaseUrl =
    credentials?.metricsApiBaseUrl?.trim() ||
    process.env.TYPEBOT_API_BASE_URL?.trim() ||
    "https://api.typebot.io";

  if (!apiToken) {
    throw new Error("Token da API de métricas do Typebot não configurado.");
  }

  const to = args.to ?? new Date();
  const from = args.from ?? new Date(to.getTime() - 24 * 60 * 60 * 1000);

  const periodStart = toDateOnly(from);
  const periodEnd = toDateOnly(to);
  const metrics = await fetchTypebotMetrics({
    botExternalId: bot.externalId,
    apiBaseUrl,
    apiToken,
    from: periodStart,
    to: periodEnd,
  });

  const [existing] = await db
    .select({ id: botMetricsSnapshots.id })
    .from(botMetricsSnapshots)
    .where(
      and(
        eq(botMetricsSnapshots.tenantId, bot.tenantId),
        eq(botMetricsSnapshots.typebotBotId, bot.id),
        eq(botMetricsSnapshots.periodStart, periodStart),
        gte(botMetricsSnapshots.periodEnd, periodStart),
        lte(botMetricsSnapshots.periodEnd, periodEnd)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(botMetricsSnapshots)
      .set({
        periodEnd,
        sessionsStarted: metrics.sessionsStarted ?? 0,
        sessionsCompleted: metrics.sessionsCompleted ?? 0,
        sessionsAbandoned: metrics.sessionsAbandoned ?? 0,
        stepMetrics: metrics.stepMetrics ?? null,
        syncedAt: new Date(),
      })
      .where(eq(botMetricsSnapshots.id, existing.id));
  } else {
    await db.insert(botMetricsSnapshots).values({
      tenantId: bot.tenantId,
      typebotBotId: bot.id,
      periodStart,
      periodEnd,
      sessionsStarted: metrics.sessionsStarted ?? 0,
      sessionsCompleted: metrics.sessionsCompleted ?? 0,
      sessionsAbandoned: metrics.sessionsAbandoned ?? 0,
      stepMetrics: metrics.stepMetrics ?? null,
      syncedAt: new Date(),
    });
  }

  return {
    botId: bot.id,
    tenantId: bot.tenantId,
    periodStart,
    periodEnd,
    sessionsStarted: metrics.sessionsStarted ?? 0,
    sessionsCompleted: metrics.sessionsCompleted ?? 0,
    sessionsAbandoned: metrics.sessionsAbandoned ?? 0,
  };
}
