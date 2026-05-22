import type { VysenRuntimeMode } from "@/server/vysen/runtime/types";

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "sim"].includes(normalized)) return true;
  if (["0", "false", "no", "nao", "não"].includes(normalized)) return false;
  return fallback;
}

export interface VysenRuntimeConfig {
  enabled: boolean;
  mode: VysenRuntimeMode;
  serviceUrl: string | null;
  sessionTable: string;
  memoryTable: string;
}

export function getVysenRuntimeConfig(): VysenRuntimeConfig {
  const enabled = parseBoolean(process.env.VYSEN_AGNO_ENABLED, false);
  const serviceUrl = process.env.VYSEN_AGNO_SERVICE_URL?.trim() || null;
  const mode: VysenRuntimeMode = enabled && serviceUrl ? "agno" : "local";

  return {
    enabled,
    mode,
    serviceUrl,
    sessionTable: process.env.VYSEN_AGNO_SESSION_TABLE?.trim() || "agno_sessions",
    memoryTable: process.env.VYSEN_AGNO_MEMORY_TABLE?.trim() || "agno_memories",
  };
}
