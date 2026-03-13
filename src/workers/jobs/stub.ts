/**
 * Job stub Base 1: será usado pela fila quando o consumer for ligado na Etapa 6.
 */
export const STUB_JOB_NAME = "stub";

export async function processStubJob(_payload: unknown): Promise<void> {
  console.log("Stub job executed", _payload);
}
