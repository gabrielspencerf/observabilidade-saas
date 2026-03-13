/**
 * Resolução de etapa do funil a partir de payload (ex.: Typebot) e regra de avanço do lead.
 * Usa funnel_steps.criteria para casar evento → etapa; não cria modelagem nova.
 */

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { funnels, funnelSteps } from "@/db/schema";

export interface ResolvedStep {
  funnelId: string;
  funnelStepId: string;
  sortOrder: number;
}

/**
 * Retorna o primeiro funil ativo do tenant (para uso como funil padrão na resolução).
 */
export async function getActiveFunnelForTenant(
  db: ReturnType<typeof getDb>,
  tenantId: string
): Promise<{ id: string; name: string } | null> {
  const [row] = await db
    .select({ id: funnels.id, name: funnels.name })
    .from(funnels)
    .where(and(eq(funnels.tenantId, tenantId), eq(funnels.isActive, true)))
    .orderBy(funnels.name)
    .limit(1);
  return row ?? null;
}

function stringOrNull(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

/**
 * Verifica se o payload casa com o criteria da etapa.
 * Convenção em funnel_steps.criteria:
 * - typebotBlockId: payload.blockId ou payload.block_id deve ser igual.
 * - typebotVariable + typebotValue: payload.variables[nome] deve ser igual ao valor.
 * Se ambos estiverem presentes, os dois devem casar (AND).
 */
function criteriaMatchesPayload(
  criteria: Record<string, unknown> | null,
  payload: Record<string, unknown>
): boolean {
  if (!criteria || typeof criteria !== "object") return false;

  const blockIdCriteria = criteria.typebotBlockId;
  const blockIdPayload =
    stringOrNull(payload.blockId) ?? stringOrNull(payload.block_id);
  const variableName = criteria.typebotVariable;
  const variableValue = criteria.typebotValue;
  const vars = payload.variables as Record<string, unknown> | undefined;
  const nameStr =
    variableName != null && typeof variableName === "string"
      ? variableName.trim()
      : null;
  const variablePayload =
    nameStr && vars && typeof vars === "object"
      ? stringOrNull(vars[nameStr])
      : null;

  let blockMatch = true;
  if (blockIdCriteria != null) {
    const want = typeof blockIdCriteria === "string" ? blockIdCriteria.trim() : String(blockIdCriteria);
    blockMatch = !!blockIdPayload && blockIdPayload === want;
  }

  let variableMatch = true;
  if (variableName != null && variableValue != null) {
    const want = typeof variableValue === "string" ? variableValue.trim() : String(variableValue);
    variableMatch = variablePayload !== null && variablePayload === want;
  }

  return blockMatch && variableMatch;
}

/**
 * Resolve a etapa do funil a partir do payload (ex.: webhook Typebot).
 * Usa o primeiro funil ativo do tenant e a primeira etapa (por sort_order) cujo criteria casa com o payload.
 * Retorna null se não houver funil ativo ou nenhuma etapa casar.
 */
export async function resolveStepFromTypebotPayload(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  payload: Record<string, unknown>
): Promise<ResolvedStep | null> {
  const funnel = await getActiveFunnelForTenant(db, tenantId);
  if (!funnel) return null;

  const steps = await db
    .select({
      id: funnelSteps.id,
      funnelId: funnelSteps.funnelId,
      sortOrder: funnelSteps.sortOrder,
      criteria: funnelSteps.criteria,
    })
    .from(funnelSteps)
    .where(
      and(
        eq(funnelSteps.tenantId, tenantId),
        eq(funnelSteps.funnelId, funnel.id)
      )
    )
    .orderBy(asc(funnelSteps.sortOrder));

  for (const step of steps) {
    const criteria = step.criteria as Record<string, unknown> | null;
    if (criteriaMatchesPayload(criteria, payload)) {
      return {
        funnelId: step.funnelId,
        funnelStepId: step.id,
        sortOrder: step.sortOrder,
      };
    }
  }
  return null;
}

/**
 * Decide se o lead pode avançar para a nova etapa (evita regressão).
 * - Lead sem funil: pode setar funil + etapa.
 * - Mesmo funil: só avança se newSortOrder >= currentSortOrder (ou current nulo).
 * - Outro funil: não altera (evita sobrescrever contexto de outro funil).
 */
export function shouldAdvanceLeadStep(
  currentFunnelId: string | null,
  currentSortOrder: number | null,
  newFunnelId: string,
  newSortOrder: number
): boolean {
  if (!currentFunnelId) return true;
  if (currentFunnelId !== newFunnelId) return false;
  if (currentSortOrder == null) return true;
  return newSortOrder >= currentSortOrder;
}
