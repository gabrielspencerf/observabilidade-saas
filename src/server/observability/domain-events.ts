type DomainEventLevel = "info" | "warn" | "error";

interface EmitDomainEventInput {
  name: string;
  level?: DomainEventLevel;
  tenantId?: string | null;
  metadata?: Record<string, unknown>;
}

function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) continue;
    if (typeof value === "string" && value.length > 400) {
      out[key] = `${value.slice(0, 400)}...`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function emitDomainEvent(input: EmitDomainEventInput): void {
  const payload = {
    ts: new Date().toISOString(),
    event: input.name,
    tenantId: input.tenantId ?? null,
    metadata: sanitizeMetadata(input.metadata),
  };
  if (input.level === "error") {
    console.error("[event]", payload);
    return;
  }
  if (input.level === "warn") {
    console.warn("[event]", payload);
    return;
  }
  console.info("[event]", payload);
}
