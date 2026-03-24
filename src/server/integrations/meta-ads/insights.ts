/**
 * Insights Marketing API (nível conta, granularidade diária).
 */

import { graphApiBaseUrl } from "./config";

export interface MetaAccountInsightDayRow {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number | null;
  raw: Record<string, unknown>;
}

function parseNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Busca série diária para o ad account (external_id = account_id numérico, sem act_).
 */
export async function fetchAccountInsightsByDay(
  accessToken: string,
  accountIdNumeric: string,
  since: string,
  until: string
): Promise<MetaAccountInsightDayRow[] | { error: string }> {
  const actId = accountIdNumeric.startsWith("act_")
    ? accountIdNumeric
    : `act_${accountIdNumeric}`;
  const base = graphApiBaseUrl();
  const timeRange = encodeURIComponent(JSON.stringify({ since, until }));
  const fields = encodeURIComponent(
    "spend,impressions,clicks,reach,cpc,cpm,ctr,actions,date_start,date_stop"
  );
  let url = `${base}/${actId}/insights?fields=${fields}&level=account&time_increment=1&time_range=${timeRange}`;

  const rows: MetaAccountInsightDayRow[] = [];

  for (let guard = 0; guard < 20; guard += 1) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
      paging?: { next?: string };
      error?: { message?: string };
    };

    if (!res.ok) {
      return { error: data.error?.message ?? `HTTP ${res.status}` };
    }

    for (const item of data.data ?? []) {
      const dateStart =
        typeof item.date_start === "string"
          ? item.date_start
          : typeof item.date_stop === "string"
            ? item.date_stop
            : "";
      if (!dateStart) continue;
      rows.push({
        date: dateStart,
        spend: parseNumber(item.spend),
        impressions: parseNumber(item.impressions),
        clicks: parseNumber(item.clicks),
        reach: item.reach != null ? parseNumber(item.reach) : null,
        raw: item,
      });
    }

    const next = data.paging?.next;
    if (!next) break;
    url = next;
  }

  return rows;
}
