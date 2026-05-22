import { AsyncLocalStorage } from "node:async_hooks";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/db/schema";

/** Drizzle client (raiz ou transação) ativo no escopo async atual. */
export type AppDatabase = PostgresJsDatabase<typeof schema>;

export const tenantDbAsyncLocalStorage = new AsyncLocalStorage<AppDatabase>();

export function getOptionalTenantDb(): AppDatabase | undefined {
  return tenantDbAsyncLocalStorage.getStore();
}
