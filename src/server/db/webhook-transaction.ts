import { NextResponse } from "next/server";
import { applyRlsToCurrentTransaction, runWithRlsContext } from "@/server/db/access-context";

/**
 * Webhooks precisam resolver instância/bot por ID (sem tenant na URL) e só depois
 * restringir o restante da transação ao tenant — compatível com RLS enforce.
 */
export async function withWebhookRlsTransaction(
  fn: (lockToTenant: (tenantId: string) => Promise<void>) => Promise<NextResponse>
): Promise<NextResponse> {
  return runWithRlsContext({ tenantId: null, bypassRls: true }, async () => {
    const lockToTenant = async (tenantId: string) => {
      await applyRlsToCurrentTransaction({
        tenantId,
        bypassRls: false,
      });
    };
    return await fn(lockToTenant);
  });
}
