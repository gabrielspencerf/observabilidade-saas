/**
 * Cliente Google Ads API: searchStream para métricas de campanha.
 * Usa developer token (MCC) e, quando definido, login-customer-id.
 */

import {
  getGoogleAdsDeveloperToken,
  getGoogleAdsLoginCustomerId,
} from "./config";

const API_VERSION = "v20";
const BASE_URL = `https://googleads.googleapis.com/${API_VERSION}`;

export interface CampaignMetricRow {
  campaignId: string;
  campaignName: string;
  date: string;
  impressions: number;
  clicks: number;
  costMicros: number;
}

/**
 * Monta os headers para uma requisição à Google Ads API.
 * customerId = conta cliente (external_id); accessToken = OAuth access token.
 * Inclui developer-token e login-customer-id (MCC) quando configurado.
 */
function buildHeaders(
  accessToken: string,
  _customerId: string
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "developer-token": getGoogleAdsDeveloperToken(),
  };
  const loginCustomerId = getGoogleAdsLoginCustomerId();
  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId;
  }
  return headers;
}

/**
 * Executa GAQL searchStream para a conta cliente e retorna linhas de métricas por campanha/dia.
 * Período: últimos 7 dias (granularidade diária).
 */
export async function fetchCampaignMetrics(
  customerId: string,
  accessToken: string,
  options: { daysBack?: number } = {}
): Promise<CampaignMetricRow[] | { error: string }> {
  const daysBack = options.daysBack ?? 7;
  const query = `SELECT
  campaign.id,
  campaign.name,
  segments.date,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros
FROM campaign
WHERE segments.date DURING LAST_${daysBack}_DAYS
  AND campaign.status = 'ENABLED'`;

  const url = `${BASE_URL}/customers/${customerId}/googleAds:searchStream`;
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(accessToken, customerId),
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      const err = JSON.parse(text) as { error?: { message?: string } };
      if (err.error?.message) msg = err.error.message;
    } catch {
      if (text.length < 200) msg = text;
    }
    return { error: msg };
  }

  const text = await res.text();
  const rows: CampaignMetricRow[] = [];

  function parseResult(
    r: {
      campaign?: { id?: string; name?: string };
      segments?: { date?: string };
      metrics?: {
        impressions?: string | number;
        clicks?: string | number;
        costMicros?: string | number;
      };
    }
  ): void {
    const campaignId = r.campaign?.id ?? "";
    const campaignName = r.campaign?.name ?? "";
    const date = r.segments?.date ?? "";
    const impressions = Number(r.metrics?.impressions ?? 0);
    const clicks = Number(r.metrics?.clicks ?? 0);
    const costMicros = Number(r.metrics?.costMicros ?? 0);
    if (campaignId && date) {
      rows.push({
        campaignId,
        campaignName,
        date,
        impressions,
        clicks,
        costMicros,
      });
    }
  }

  try {
    const trimmed = text.trim();
    const firstChar = trimmed[0];
    if (firstChar === "[") {
      const batches = JSON.parse(trimmed) as Array<{ results?: unknown[] }>;
      for (const batch of batches) {
        const results = batch.results ?? [];
        for (const r of results) {
          parseResult(r as Parameters<typeof parseResult>[0]);
        }
      }
    } else if (firstChar === "{") {
      const obj = JSON.parse(trimmed) as { results?: unknown[] };
      const results = obj.results ?? [];
      for (const r of results) {
        parseResult(r as Parameters<typeof parseResult>[0]);
      }
    } else {
      const lines = trimmed.split("\n").filter(Boolean);
      for (const line of lines) {
        const batch = JSON.parse(line) as { results?: unknown[] };
        const results = batch.results ?? [];
        for (const r of results) {
          parseResult(r as Parameters<typeof parseResult>[0]);
        }
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `Parse da resposta: ${msg}` };
  }

  return rows;
}

/**
 * Obtém o currency_code da conta (Customer.currency_code, ex: BRL, USD).
 * Usado no sync para preencher google_ads_accounts.currency_code quando null.
 */
export async function getCustomerCurrency(
  customerId: string,
  accessToken: string
): Promise<string | { error: string }> {
  const url = `${BASE_URL}/customers/${customerId}/googleAds:searchStream`;
  const query = `SELECT customer.id, customer.currency_code FROM customer LIMIT 1`;
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(accessToken, customerId),
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      const err = JSON.parse(text) as { error?: { message?: string } };
      if (err.error?.message) msg = err.error.message;
    } catch {
      if (text.length < 200) msg = text;
    }
    return { error: msg };
  }

  const text = await res.text();
  const trimmed = text.trim();
  const firstChar = trimmed[0];

  function parseOne(
    r: { customer?: { id?: string; currencyCode?: string } }
  ): string | null {
    const code = r.customer?.currencyCode;
    return typeof code === "string" && code.length > 0 ? code : null;
  }

  try {
    if (firstChar === "[") {
      const batches = JSON.parse(trimmed) as Array<{ results?: unknown[] }>;
      for (const batch of batches) {
        const results = batch.results ?? [];
        for (const r of results) {
          const code = parseOne(r as Parameters<typeof parseOne>[0]);
          if (code) return code;
        }
      }
    } else if (firstChar === "{") {
      const obj = JSON.parse(trimmed) as { results?: unknown[] };
      const results = obj.results ?? [];
      for (const r of results) {
        const code = parseOne(r as Parameters<typeof parseOne>[0]);
        if (code) return code;
      }
    } else {
      const lines = trimmed.split("\n").filter(Boolean);
      for (const line of lines) {
        const batch = JSON.parse(line) as { results?: unknown[] };
        const results = batch.results ?? [];
        for (const r of results) {
          const code = parseOne(r as Parameters<typeof parseOne>[0]);
          if (code) return code;
        }
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `Parse: ${msg}` };
  }

  return { error: "Resposta sem currency_code" };
}
