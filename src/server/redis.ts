/**
 * Cliente Redis para uso na app (ex.: enfileirar jobs após ingest de webhook).
 * Em ambiente serverless, criar e encerrar por request evita conexões órfãs.
 */

import Redis from "ioredis";

function getRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL não definida. Configure em .env.local");
  }
  return url;
}

/**
 * Cria um cliente Redis. O chamador deve chamar redis.quit() após o uso quando
 * não for reutilizar a conexão (ex.: após enqueue em rota de webhook).
 */
export function createRedisClient(): Redis {
  return new Redis(getRedisUrl(), {
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
  });
}
