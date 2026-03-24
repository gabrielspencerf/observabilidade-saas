import QRCode from "qrcode";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

async function requestWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function evolutionHeaders(apiKey: string | null): HeadersInit | undefined {
  if (!apiKey) return undefined;
  return { apikey: apiKey };
}

function extractStateFromJson(data: unknown): string {
  if (!data || typeof data !== "object") return "unknown";
  const root = data as Record<string, unknown>;
  if (typeof root.state === "string") return root.state;
  const instance = root.instance;
  if (instance && typeof instance === "object") {
    const inst = instance as Record<string, unknown>;
    if (typeof inst.state === "string") return inst.state;
    const nested = inst.instance;
    if (nested && typeof nested === "object") {
      const s = (nested as Record<string, unknown>).state;
      if (typeof s === "string") return s;
    }
  }
  const status = root.status;
  if (typeof status === "string") return status;
  return "unknown";
}

export type EvolutionConnectPayload = {
  pairingCode?: string;
  code?: string;
  /** PNG data URL for display */
  qrDataUrl?: string;
};

function parseConnectBody(data: unknown): EvolutionConnectPayload {
  if (!data || typeof data !== "object") return {};
  const root = data as Record<string, unknown>;
  const pairingCode =
    typeof root.pairingCode === "string" ? root.pairingCode
    : typeof root.pairing_code === "string" ? root.pairing_code
    : undefined;
  const code = typeof root.code === "string" ? root.code : undefined;
  const qrcode = root.qrcode;
  if (qrcode && typeof qrcode === "object") {
    const qr = qrcode as Record<string, unknown>;
    const b64 = typeof qr.base64 === "string" ? qr.base64 : undefined;
    if (b64) {
      const prefix = b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
      return { pairingCode, code, qrDataUrl: prefix };
    }
  }
  return { pairingCode, code };
}

async function maybeQrFromCode(code: string | undefined): Promise<string | undefined> {
  if (!code?.trim()) return undefined;
  try {
    return await QRCode.toDataURL(code.trim(), {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
    });
  } catch {
    return undefined;
  }
}

export async function fetchEvolutionConnectionState(args: {
  baseUrl: string;
  externalId: string;
  apiKey: string | null;
}): Promise<{ ok: boolean; state: string; statusCode: number; error?: string }> {
  const base = normalizeBaseUrl(args.baseUrl);
  const name = encodeURIComponent(args.externalId);
  const paths = [
    `/instance/connectionState/${name}`,
    `/instance/connection-state/${name}`,
  ];
  let lastCode = 0;
  let lastErr: string | undefined;
  for (const p of paths) {
    const url = `${base}${p}`;
    try {
      const res = await requestWithTimeout(
        url,
        { method: "GET", headers: evolutionHeaders(args.apiKey) },
        12000
      );
      lastCode = res.status;
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        lastErr = t ? t.slice(0, 200) : res.statusText;
        continue;
      }
      const json = (await res.json().catch(() => null)) as unknown;
      return { ok: true, state: extractStateFromJson(json), statusCode: res.status };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  return {
    ok: false,
    state: "unknown",
    statusCode: lastCode || 0,
    error: lastErr ?? "Falha ao consultar estado da instância",
  };
}

export async function fetchEvolutionConnect(args: {
  baseUrl: string;
  externalId: string;
  apiKey: string | null;
}): Promise<{ ok: boolean; payload?: EvolutionConnectPayload; statusCode: number; error?: string }> {
  if (!args.apiKey) {
    return { ok: false, statusCode: 0, error: "API key da instância não configurada" };
  }
  const base = normalizeBaseUrl(args.baseUrl);
  const name = encodeURIComponent(args.externalId);
  const url = `${base}/instance/connect/${name}`;
  try {
    const res = await requestWithTimeout(
      url,
      { method: "GET", headers: evolutionHeaders(args.apiKey) },
      15000
    );
    const statusCode = res.status;
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return {
        ok: false,
        statusCode,
        error: t ? t.slice(0, 280) : res.statusText || "Erro ao gerar QR",
      };
    }
    const json = (await res.json().catch(() => null)) as unknown;
    const parsed = parseConnectBody(json) as EvolutionConnectPayload;
    let qrDataUrl = parsed.qrDataUrl;
    if (!qrDataUrl && parsed.code) {
      qrDataUrl = await maybeQrFromCode(parsed.code);
    }
    return {
      ok: true,
      statusCode,
      payload: { ...parsed, qrDataUrl },
    };
  } catch (e) {
    return {
      ok: false,
      statusCode: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
