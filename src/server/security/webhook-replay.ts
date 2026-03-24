import { createHash } from "crypto";
import { createRedisClient } from "@/server/redis";

export interface CheckWebhookReplayInput {
  provider: "typebot" | "evolution" | "uazapi";
  resourceId: string;
  externalEventId?: string | null;
  timestampHeader?: string | null;
  signatureHeader?: string | null;
  rawBody: string;
}

function fingerprint(input: CheckWebhookReplayInput): string {
  const base =
    input.externalEventId?.trim() ||
    `${input.timestampHeader ?? ""}|${input.signatureHeader ?? ""}|${input.rawBody}`;
  return createHash("sha256").update(base, "utf8").digest("hex");
}

export async function checkWebhookReplay(
  input: CheckWebhookReplayInput
): Promise<{ ok: true } | { ok: false }> {
  const redis = createRedisClient();
  const fp = fingerprint(input);
  const key = `webhook:replay:${input.provider}:${input.resourceId}:${fp}`;

  try {
    const result = await redis.set(key, "1", "EX", 10 * 60, "NX");
    if (result !== "OK") return { ok: false };
    return { ok: true };
  } finally {
    redis.quit();
  }
}
