export type IntegrationProvider = "evolution" | "uazapi" | "typebot";

export interface ProviderStatusItem {
  provider: IntegrationProvider;
  resourceId: string;
  tenantId: string;
  ok: boolean;
  status: string;
  latencyMs: number;
  details?: Record<string, unknown>;
}

export interface ProviderAdapter {
  provider: IntegrationProvider;
  fetchStatuses: () => Promise<ProviderStatusItem[]>;
}
