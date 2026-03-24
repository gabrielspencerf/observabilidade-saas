/**
 * Lista contas de anúncio acessíveis com o token do usuário.
 */

import type { MetaPendingAdAccount } from "@/server/meta-ads-pending";
import { graphApiBaseUrl } from "./config";

export async function listAdAccounts(
  accessToken: string
): Promise<MetaPendingAdAccount[] | { error: string }> {
  const base = graphApiBaseUrl();
  const fields = encodeURIComponent("id,account_id,name,currency");
  let url = `${base}/me/adaccounts?fields=${fields}&limit=200`;
  const collected: MetaPendingAdAccount[] = [];

  for (let guard = 0; guard < 20; guard += 1) {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json()) as {
      data?: Array<{
        id?: string;
        account_id?: string;
        name?: string;
        currency?: string;
      }>;
      paging?: { next?: string };
      error?: { message?: string };
    };

    if (!res.ok) {
      return { error: data.error?.message ?? `HTTP ${res.status}` };
    }

    const chunk = data.data ?? [];
    for (const row of chunk) {
      if (!row.account_id || !row.id) continue;
      collected.push({
        id: row.id,
        accountId: row.account_id,
        name: row.name ?? `Conta ${row.account_id}`,
        currency: row.currency,
      });
    }

    const next = data.paging?.next;
    if (!next) break;
    url = next;
  }

  return collected;
}
