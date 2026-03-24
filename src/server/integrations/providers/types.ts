export type IntegrationProvider = "evolution" | "uazapi" | "typebot";

export type ProviderStatusErrorType =
  | "endpoint_not_found"
  | "auth"
  | "http_error"
  | "upstream_error"
  | "timeout"
  | "network"
  | "unknown";

export interface ProviderStatusDetails {
  externalId?: string;
  endpointChecked?: string;
  checkedAt?: string;
  statusCode?: number;
  statusText?: string;
  errorType?: ProviderStatusErrorType;
  error?: string;
  hint?: string;
  bodyPreview?: string;
}

export interface ProviderStatusItem {
  provider: IntegrationProvider;
  resourceId: string;
  tenantId: string;
  ok: boolean;
  status: string;
  latencyMs: number;
  details?: ProviderStatusDetails;
}

export interface ProviderAdapter {
  provider: IntegrationProvider;
  fetchStatuses: () => Promise<ProviderStatusItem[]>;
}
