import type {
  VysenRuntimeMode,
  VysenRuntimeSessionInput,
  VysenSessionContext,
  VysenWorkflowRunRequest,
  VysenWorkflowRunResult,
} from "@/server/vysen/runtime/types";

export interface VysenRuntimeProvider {
  readonly mode: VysenRuntimeMode;
  getSessionContext(input: VysenRuntimeSessionInput): Promise<VysenSessionContext>;
  queueWorkflowRun(input: VysenWorkflowRunRequest): Promise<VysenWorkflowRunResult>;
}
