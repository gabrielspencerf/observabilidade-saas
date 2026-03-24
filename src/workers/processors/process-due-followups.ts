import type { JobProcessDueFollowupsTenant } from "@/workers/queue/types";
import { processDueFollowupsForTenant } from "@/server/followup/engine";

export async function processDueFollowupsTenantJob(
  job: JobProcessDueFollowupsTenant
): Promise<{ ok: true } | { error: string }> {
  try {
    await processDueFollowupsForTenant(job.tenantId);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

