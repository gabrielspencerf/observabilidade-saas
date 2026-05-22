import type { VysenRuntimeProvider } from "@/server/vysen/runtime/provider";
import type {
  VysenMemoryRecord,
  VysenRuntimeSessionInput,
  VysenSessionContext,
  VysenWorkflowRunRequest,
  VysenWorkflowRunResult,
} from "@/server/vysen/runtime/types";

function nowIso() {
  return new Date().toISOString();
}

function normalizeMemories(input: VysenRuntimeSessionInput): VysenMemoryRecord[] {
  const memories: VysenMemoryRecord[] = [];
  const contexts = Array.isArray(input.memoryContext?.threadContexts)
    ? input.memoryContext?.threadContexts ?? []
    : [];
  const previousSummaries = Array.isArray(input.memoryContext?.previousSummaries)
    ? input.memoryContext?.previousSummaries ?? []
    : [];

  contexts
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .slice(0, 8)
    .forEach((context, index) => {
      memories.push({
        id: `local-context-${index}`,
        scope: "conversation",
        content: context.trim().slice(0, 380),
        relevance: 0.8,
        createdAt: nowIso(),
        metadata: { source: "thread-context" },
      });
    });

  previousSummaries
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .slice(0, 5)
    .forEach((summary, index) => {
      memories.push({
        id: `local-summary-${index}`,
        scope: "operation",
        content: summary.trim().slice(0, 280),
        relevance: 0.55,
        createdAt: nowIso(),
        metadata: { source: "previous-summary" },
      });
    });

  return memories;
}

export class LocalVysenRuntimeProvider implements VysenRuntimeProvider {
  readonly mode = "local" as const;

  async getSessionContext(input: VysenRuntimeSessionInput): Promise<VysenSessionContext> {
    const recentTurns =
      input.history?.map((item) => ({
        role: item.role,
        content: item.content.slice(0, 1800),
        createdAt: nowIso(),
      })) ?? [];

    const summary =
      input.memoryContext?.threadSummary && input.memoryContext.threadSummary.trim()
        ? {
            summary: input.memoryContext.threadSummary.trim().slice(0, 420),
            topics: [input.contextArea?.trim() || "geral"],
            updatedAt: nowIso(),
          }
        : null;

    return {
      sessionId: input.sessionId,
      tenantId: input.tenantId ?? null,
      userId: input.userId ?? null,
      mode: this.mode,
      recentTurns,
      summary,
      memories: normalizeMemories(input),
      metadata: {
        source: "local-runtime",
        contextArea: input.contextArea ?? "geral",
      },
    };
  }

  async queueWorkflowRun(input: VysenWorkflowRunRequest): Promise<VysenWorkflowRunResult> {
    return {
      workflow: input.workflow,
      status: "skipped",
      mode: this.mode,
      details: {
        reason: "agno_not_enabled",
        sessionId: input.sessionId,
      },
    };
  }
}
