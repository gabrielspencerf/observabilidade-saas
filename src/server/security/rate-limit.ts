import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { createRedisClient } from "@/server/redis";

function clientIpFromRequest(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function hashKeyPart(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export interface RateLimitInput {
  request: NextRequest;
  bucket: string;
  max: number;
  windowSeconds: number;
  resourceKey?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  input: RateLimitInput
): Promise<RateLimitResult> {
  const ip = clientIpFromRequest(input.request);
  const resource = input.resourceKey ? hashKeyPart(input.resourceKey) : "any";
  const key = `ratelimit:${input.bucket}:${hashKeyPart(ip)}:${resource}`;
  const redis = createRedisClient();

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, input.windowSeconds);
    }
    const ttl = await redis.ttl(key);
    const retryAfterSeconds = ttl > 0 ? ttl : input.windowSeconds;
    const remaining = Math.max(0, input.max - count);
    return {
      allowed: count <= input.max,
      remaining,
      retryAfterSeconds,
    };
  } finally {
    redis.quit();
  }
}
