export type VysenRuntimeMode = "local" | "agno";

export interface VysenSessionTurn {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface VysenSessionSummary {
  summary: string;
  topics: string[];
  updatedAt: string;
}

export interface VysenMemoryRecord {
  id: string;
  scope: "user" | "tenant" | "conversation" | "operation";
  content: string;
  relevance?: number | null;
  createdAt: string;
  updatedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface VysenSessionContext {
  sessionId: string;
  tenantId?: string | null;
  userId?: string | null;
  mode: VysenRuntimeMode;
  recentTurns: VysenSessionTurn[];
  summary: VysenSessionSummary | null;
  memories: VysenMemoryRecord[];
  metadata?: Record<string, unknown> | null;
}

export interface VysenRuntimeSessionInput {
  sessionId: string;
  tenantId?: string | null;
  userId?: string | null;
  contextArea?: string | null;
  message?: string | null;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  memoryContext?: {
    threadSummary?: string | null;
    threadContexts?: string[];
    previousSummaries?: string[];
  };
}

export interface VysenWorkflowRunRequest {
  workflow: "session-summary" | "memory-extraction" | "memory-optimization";
  sessionId: string;
  tenantId?: string | null;
  userId?: string | null;
  payload?: Record<string, unknown>;
}

export interface VysenWorkflowRunResult {
  workflow: VysenWorkflowRunRequest["workflow"];
  status: "queued" | "completed" | "skipped";
  mode: VysenRuntimeMode;
  details?: Record<string, unknown>;
}
