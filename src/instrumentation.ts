export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { assertProductionSecurityBaseline } = await import(
    "@/server/security/startup-guards"
  );
  assertProductionSecurityBaseline();
}
