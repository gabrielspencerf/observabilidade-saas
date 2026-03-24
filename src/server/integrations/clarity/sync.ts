/**
 * Microsoft Clarity Data Export API (project-live-insights).
 * Limite: até 10 req/dia por projeto — sync manual/disparado com moderação.
 */

const CLARITY_EXPORT_URL =
  "https://www.clarity.ms/export-data/api/v1/project-live-insights";

export async function fetchClarityProjectLiveInsights(
  apiToken: string,
  options: { numOfDays: 1 | 2 | 3; dimension1?: string }
): Promise<unknown | { error: string }> {
  const numOfDays = options.numOfDays;
  const url = new URL(CLARITY_EXPORT_URL);
  url.searchParams.set("numOfDays", String(numOfDays));
  const dim = options.dimension1?.trim() || "URL";
  url.searchParams.set("dimension1", dim);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = (await res.json()) as { error?: string; message?: string };
  if (!res.ok) {
    const msg =
      (typeof data.message === "string" && data.message) ||
      (typeof data.error === "string" && data.error) ||
      `HTTP ${res.status}`;
    return { error: msg };
  }
  return data;
}
