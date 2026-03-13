/**
 * Cliente Drizzle em runtime — acesso ao PostgreSQL.
 * Schema e migrations ficam em db/; aqui apenas a conexão e o cliente.
 *
 * Em desenvolvimento Next.js, o módulo pode ser re-executado a cada HMR;
 * o singleton em globalThis evita múltiplas conexões (evita "too many clients").
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não definida. Configure em .env.local");
}

declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof drizzle> | undefined;
}

function createDb() {
  const client = postgres(connectionString!, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(client, { schema });
}

let _db: ReturnType<typeof drizzle> | undefined;

export function getDb(): ReturnType<typeof drizzle> {
  if (process.env.NODE_ENV !== "production") {
    if (!globalThis.__db) globalThis.__db = createDb();
    return globalThis.__db;
  }
  if (!_db) _db = createDb();
  return _db;
}

/**
 * Cliente singleton para uso em API routes e server code.
 * Preferir getDb() em código que pode rodar em contexto de script (ex.: seed).
 */
export const db = getDb();

export type Database = ReturnType<typeof getDb>;
