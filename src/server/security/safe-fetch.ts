import { lookup } from "node:dns/promises";

function ip4ToInt(ip: string): number {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return -1;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

const PRIVATE_IPV4_RANGES: Array<{ start: number; end: number; label: string }> = [
  { start: ip4ToInt("10.0.0.0"), end: ip4ToInt("10.255.255.255"), label: "10.0.0.0/8" },
  {
    start: ip4ToInt("172.16.0.0"),
    end: ip4ToInt("172.31.255.255"),
    label: "172.16.0.0/12",
  },
  {
    start: ip4ToInt("192.168.0.0"),
    end: ip4ToInt("192.168.255.255"),
    label: "192.168.0.0/16",
  },
  { start: ip4ToInt("127.0.0.0"), end: ip4ToInt("127.255.255.255"), label: "127.0.0.0/8" },
  { start: ip4ToInt("0.0.0.0"), end: ip4ToInt("0.255.255.255"), label: "0.0.0.0/8" },
  {
    start: ip4ToInt("169.254.0.0"),
    end: ip4ToInt("169.254.255.255"),
    label: "link-local (169.254.0.0/16)",
  },
  {
    start: ip4ToInt("100.64.0.0"),
    end: ip4ToInt("100.127.255.255"),
    label: "CGNAT (100.64.0.0/10)",
  },
];

function isPrivateOrBlockedIpv4Int(n: number): boolean {
  for (const r of PRIVATE_IPV4_RANGES) {
    if (n >= r.start && n <= r.end) return true;
  }
  return false;
}

function parseIpv4Literal(host: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return null;
  const parts = [m[1], m[2], m[3], m[4]].map((x) => Number(x));
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ip4ToInt(parts.join("."));
}

// Hostnames de Instance Metadata Service de cloud providers. Resolvem para
// 169.254.169.254 (já bloqueado via link-local em PRIVATE_IPV4_RANGES), mas
// alguns sandboxes/proxies podem redirecionar via DNS — bloquear o nome também
// fecha o vetor independentemente do que o DNS resolver retorna.
const BLOCKED_HOSTNAMES = new Set<string>([
  "metadata.google.internal",
  "metadata",
  "metadata.aws.amazon.com",
  "metadata.azure.com",
  "instance-data",
  "instance-data.ec2.internal",
]);

function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase().trim();
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (BLOCKED_HOSTNAMES.has(h)) return true;
  const ipv4 = parseIpv4Literal(h);
  if (ipv4 !== null) {
    return isPrivateOrBlockedIpv4Int(ipv4 >>> 0);
  }
  if (h === "[::1]" || h === "::1") return true;
  return false;
}

function hostMatchesAllowlist(hostname: string, allowedHosts: string[]): boolean {
  const host = hostname.toLowerCase();
  for (const entry of allowedHosts) {
    const e = entry.toLowerCase().trim();
    if (!e) continue;
    if (host === e) return true;
    if (host.endsWith(`.${e}`)) return true;
  }
  return false;
}

export interface SafeFetchOptions extends RequestInit {
  /** Hostnames permitidos (ex.: host extraído da base URL da integração). */
  allowedHosts: string[];
  timeoutMs?: number;
  maxRedirects?: number;
}

export class SafeFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafeFetchError";
  }
}

/** Extrai hostname da base URL configurada na integração (para allowlist). */
export function allowedHostsFromIntegrationBaseUrl(baseUrl: string): string[] {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    throw new SafeFetchError("baseUrl vazio");
  }
  try {
    const u = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (!u.hostname) {
      throw new SafeFetchError("hostname ausente");
    }
    return [u.hostname.toLowerCase()];
  } catch (e) {
    if (e instanceof SafeFetchError) throw e;
    throw new SafeFetchError("baseUrl inválido");
  }
}

async function assertResolvedHostsSafe(hostname: string): Promise<void> {
  if (isBlockedHostname(hostname)) {
    throw new SafeFetchError(`Host bloqueado: ${hostname}`);
  }
  try {
    const res = await lookup(hostname, { all: true });
    for (const a of res) {
      if (a.family === 4) {
        const n = ip4ToInt(a.address);
        if (n < 0 || isPrivateOrBlockedIpv4Int(n >>> 0)) {
          throw new SafeFetchError(`DNS resolve para IP não permitido: ${a.address}`);
        }
      } else if (a.family === 6) {
        const addr = a.address.toLowerCase();
        if (
          addr === "::1" ||
          addr.startsWith("fe80:") ||
          addr.startsWith("fc") ||
          addr.startsWith("fd")
        ) {
          throw new SafeFetchError(`DNS resolve para IPv6 não permitido: ${a.address}`);
        }
      }
    }
  } catch (e) {
    if (e instanceof SafeFetchError) throw e;
    throw new SafeFetchError(
      `Falha ao validar DNS para SSRF: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

/**
 * Fetch HTTP(S) com bloqueio de destinos perigosos, allowlist de host, timeout e limite de redirect.
 */
export async function safeFetch(urlString: string, options: SafeFetchOptions): Promise<Response> {
  const { allowedHosts, timeoutMs = 15_000, maxRedirects = 3, ...init } = options;
  if (!allowedHosts.length) {
    throw new SafeFetchError("allowedHosts não pode ser vazio");
  }

  let current = urlString;
  let redirects = 0;

  while (true) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      throw new SafeFetchError("URL inválida");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new SafeFetchError(`Protocolo não permitido: ${parsed.protocol}`);
    }
    const host = parsed.hostname;
    if (!hostMatchesAllowlist(host, allowedHosts)) {
      throw new SafeFetchError(`Host fora da allowlist: ${host}`);
    }
    if (isBlockedHostname(host)) {
      throw new SafeFetchError(`Host bloqueado: ${host}`);
    }
    await assertResolvedHostsSafe(host);

    const timeoutController = new AbortController();
    const t = setTimeout(() => timeoutController.abort(), timeoutMs);
    const signal =
      init.signal != null
        ? AbortSignal.any([timeoutController.signal, init.signal])
        : timeoutController.signal;
    try {
      const res = await fetch(parsed.toString(), {
        ...init,
        redirect: "manual",
        signal,
      });

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) {
          return res;
        }
        if (redirects >= maxRedirects) {
          throw new SafeFetchError("Limite de redirects excedido");
        }
        redirects += 1;
        current = new URL(loc, parsed).toString();
        continue;
      }

      return res;
    } finally {
      clearTimeout(t);
    }
  }
}
