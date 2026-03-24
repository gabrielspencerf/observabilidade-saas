export interface UazapiCredentialInput {
  apiKey?: string | null;
  token?: string | null;
  adminToken?: string | null;
  legacyCredential?: string | null;
}

export interface NormalizedUazapiCredential {
  apiKey: string | null;
  token: string | null;
  adminToken: string | null;
}

function clean(value?: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function parseLegacyCredential(raw?: string | null): NormalizedUazapiCredential {
  const value = clean(raw);
  if (!value) {
    return { apiKey: null, token: null, adminToken: null };
  }

  if (value.startsWith("{") && value.endsWith("}")) {
    try {
      const parsed = JSON.parse(value) as {
        apiKey?: unknown;
        apikey?: unknown;
        token?: unknown;
        adminToken?: unknown;
        admintoken?: unknown;
      };
      return {
        apiKey:
          typeof parsed.apiKey === "string" ? clean(parsed.apiKey)
          : typeof parsed.apikey === "string" ? clean(parsed.apikey)
          : null,
        token: typeof parsed.token === "string" ? clean(parsed.token) : null,
        adminToken:
          typeof parsed.adminToken === "string" ? clean(parsed.adminToken)
          : typeof parsed.admintoken === "string" ? clean(parsed.admintoken)
          : null,
      };
    } catch {
      return {
        apiKey: value,
        token: value,
        adminToken: null,
      };
    }
  }

  if (value.includes("=")) {
    const params = new URLSearchParams(value.replace(/[;,]/g, "&"));
    return {
      apiKey: clean(params.get("apikey")) ?? clean(params.get("apiKey")),
      token: clean(params.get("token")),
      adminToken: clean(params.get("admintoken")) ?? clean(params.get("adminToken")),
    };
  }

  // Compatibilidade: valor bruto é tratado como token (principal) e apiKey.
  return {
    apiKey: value,
    token: value,
    adminToken: null,
  };
}

export function normalizeUazapiCredential(
  input: UazapiCredentialInput
): NormalizedUazapiCredential {
  const explicit: NormalizedUazapiCredential = {
    apiKey: clean(input.apiKey),
    token: clean(input.token),
    adminToken: clean(input.adminToken),
  };

  if (explicit.apiKey || explicit.token || explicit.adminToken) {
    return explicit;
  }
  return parseLegacyCredential(input.legacyCredential);
}

export function validateUazapiCredential(
  input: UazapiCredentialInput,
  requireAnyCredential = false
): string | null {
  const normalized = normalizeUazapiCredential(input);
  if (normalized.adminToken && !normalized.token) {
    return "Informe o token quando usar admin token.";
  }
  if (requireAnyCredential && !normalized.apiKey && !normalized.token && !normalized.adminToken) {
    return "Informe ao menos uma credencial (token/admin token ou API key).";
  }
  return null;
}
