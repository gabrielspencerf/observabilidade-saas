import QRCode from "qrcode";
import type { UazapiInstanceCredentials } from "./credentials";
import { getUazapiInstanceCredentials } from "./credentials";
import {
  allowedHostsFromIntegrationBaseUrl,
  safeFetch,
} from "@/server/security/safe-fetch";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

async function uazapiSafeRequest(
  url: string,
  baseUrl: string,
  init: RequestInit,
  timeoutMs: number
) {
  const allowedHosts = allowedHostsFromIntegrationBaseUrl(baseUrl);
  return safeFetch(url, {
    ...init,
    allowedHosts,
    timeoutMs,
    maxRedirects: 2,
  });
}

function buildHeaders(creds: UazapiInstanceCredentials): HeadersInit | undefined {
  const headers: Record<string, string> = {};
  if (creds.apiKey) headers.apikey = creds.apiKey;
  if (creds.token) {
    headers.token = creds.token;
    headers.Authorization = `Bearer ${creds.token}`;
  }
  if (creds.adminToken) headers.admintoken = creds.adminToken;
  return Object.keys(headers).length > 0 ? headers : undefined;
}

function appendTokenQuery(basePath: string, creds: UazapiInstanceCredentials): string[] {
  const urls = new Set<string>();
  urls.add(basePath);
  try {
    const u = new URL(basePath);
    if (creds.token) u.searchParams.set("token", creds.token);
    if (creds.adminToken) {
      u.searchParams.set("admintoken", creds.adminToken);
    }
    urls.add(u.toString());
  } catch {
    /* ignore */
  }
  return Array.from(urls);
}

function extractUazapiState(data: unknown): string {
  if (!data || typeof data !== "object") return "unknown";
  const root = data as Record<string, unknown>;
  const direct =
    typeof root.state === "string" ? root.state
    : typeof root.status === "string" ? root.status
    : typeof root.connection === "string" ? root.connection
    : undefined;
  if (direct) return direct;
  const instance = root.instance;
  if (instance && typeof instance === "object") {
    const inst = instance as Record<string, unknown>;
    const s =
      typeof inst.state === "string" ? inst.state
      : typeof inst.status === "string" ? inst.status
      : undefined;
    if (s) return s;
  }
  if (typeof root.connected === "boolean") {
    return root.connected ? "connected" : "disconnected";
  }
  return "unknown";
}

type ConnectParse = {
  pairingCode?: string;
  code?: string;
  qrDataUrl?: string;
};

function parseUazapiConnectJson(data: unknown): ConnectParse {
  if (!data || typeof data !== "object") return {};
  const root = data as Record<string, unknown>;
  const pairingCode =
    typeof root.pairingCode === "string" ? root.pairingCode
    : typeof root.pairing_code === "string" ? root.pairing_code
    : undefined;
  const qrcode = root.qrcode;
  if (qrcode && typeof qrcode === "object") {
    const qr = qrcode as Record<string, unknown>;
    const b64 = typeof qr.base64 === "string" ? qr.base64 : undefined;
    if (b64) {
      const prefix = b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
      const code = typeof root.code === "string" ? root.code : undefined;
      return { pairingCode, code, qrDataUrl: prefix };
    }
  }
  const code =
    typeof root.code === "string" ? root.code
    : typeof root.qrcode === "string" ? root.qrcode
    : undefined;
  const base64 = typeof root.base64 === "string" ? root.base64 : undefined;
  if (base64) {
    const prefix = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
    return { pairingCode, code, qrDataUrl: prefix };
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

export async function fetchUazapiConnectionState(args: {
  baseUrl: string;
  creds: UazapiInstanceCredentials;
}): Promise<{ ok: boolean; state: string; statusCode: number; error?: string }> {
  const base = normalizeBaseUrl(args.baseUrl);
  const statusUrl = `${base}/instance/status`;
  const attempts: { url: string; headers?: HeadersInit }[] = [];
  for (const url of appendTokenQuery(statusUrl, args.creds)) {
    attempts.push({ url, headers: buildHeaders(args.creds) });
    attempts.push({ url });
  }
  if (args.creds.apiKey) {
    attempts.push({
      url: statusUrl,
      headers: { apikey: args.creds.apiKey },
    });
    attempts.push({
      url: statusUrl,
      headers: { "x-api-key": args.creds.apiKey },
    });
  }

  let lastCode = 0;
  let lastErr: string | undefined;
  for (const a of attempts) {
    try {
      const res = await uazapiSafeRequest(
        a.url,
        args.baseUrl,
        { method: "GET", headers: a.headers },
        12000
      );
      lastCode = res.status;
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        lastErr = t ? t.slice(0, 200) : res.statusText;
        if (res.status === 401 || res.status === 403) continue;
        if (res.status === 404) continue;
        continue;
      }
      const json = (await res.json().catch(() => null)) as unknown;
      return { ok: true, state: extractUazapiState(json), statusCode: res.status };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  return {
    ok: false,
    state: "unknown",
    statusCode: lastCode || 0,
    error: lastErr ?? "Falha ao consultar status na UAZAPI",
  };
}

export async function fetchUazapiConnect(args: {
  baseUrl: string;
  creds: UazapiInstanceCredentials;
}): Promise<{ ok: boolean; payload?: ConnectParse; statusCode: number; error?: string }> {
  const base = normalizeBaseUrl(args.baseUrl);
  const paths = [`${base}/instance/connect`, `${base}/instance/qrcode`, `${base}/connect`];
  const attempts: { url: string; headers?: HeadersInit }[] = [];
  for (const p of paths) {
    for (const url of appendTokenQuery(p, args.creds)) {
      attempts.push({ url, headers: buildHeaders(args.creds) });
      attempts.push({ url });
    }
    if (args.creds.apiKey) {
      attempts.push({ url: p, headers: { apikey: args.creds.apiKey } });
    }
  }

  let lastCode = 0;
  let lastErr: string | undefined;
  for (const a of attempts) {
    try {
      const res = await uazapiSafeRequest(
        a.url,
        args.baseUrl,
        { method: "GET", headers: a.headers },
        15000
      );
      lastCode = res.status;
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        lastErr = t ? t.slice(0, 200) : res.statusText;
        continue;
      }
      const text = await res.text().catch(() => "");
      let json: unknown;
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        lastErr = "Resposta não é JSON";
        continue;
      }
      const parsed = parseUazapiConnectJson(json);
      let qrDataUrl = parsed.qrDataUrl;
      if (!qrDataUrl && parsed.code) {
        qrDataUrl = await maybeQrFromCode(parsed.code);
      }
      if (!qrDataUrl && !parsed.pairingCode && !parsed.code) {
        lastErr = "Resposta sem QR ou código de pareamento";
        continue;
      }
      return {
        ok: true,
        statusCode: res.status,
        payload: { ...parsed, qrDataUrl },
      };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  return {
    ok: false,
    statusCode: lastCode || 0,
    error: lastErr ?? "Não foi possível obter QR da UAZAPI (ver documentação do provedor)",
  };
}

export async function loadUazapiCredentialsForInstance(
  uazapiInstanceId: string
): Promise<UazapiInstanceCredentials> {
  return getUazapiInstanceCredentials(uazapiInstanceId);
}
