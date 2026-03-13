/**
 * OAuth e acesso à API Google Ads: troca de code por tokens e listagem de contas acessíveis.
 * Não logar tokens em nenhum momento.
 */

import {
  getGoogleAdsClientId,
  getGoogleAdsClientSecret,
  getGoogleAdsRedirectUri,
  getGoogleOAuthTokenUrl,
} from "./config";

const LIST_ACCESSIBLE_CUSTOMERS_URL =
  "https://googleads.googleapis.com/v20/customers:listAccessibleCustomers";

export interface TokenResponse {
  refreshToken: string;
  accessToken: string;
  expiresIn: number;
}

/**
 * Troca o authorization code por refresh_token e access_token.
 * Requer scope adwords e prompt=consent para receber refresh_token.
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<TokenResponse | { error: string }> {
  const clientId = getGoogleAdsClientId();
  const clientSecret = getGoogleAdsClientSecret();
  const redirectUri = getGoogleAdsRedirectUri();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(getGoogleOAuthTokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await res.json()) as {
    refresh_token?: string;
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok) {
    const msg =
      data.error_description ?? data.error ?? `HTTP ${res.status}`;
    return { error: msg };
  }

  const refreshToken = data.refresh_token;
  const accessToken = data.access_token;
  const expiresIn = data.expires_in;

  if (!refreshToken || !accessToken) {
    return {
      error: "Resposta OAuth sem refresh_token ou access_token",
    };
  }

  return {
    refreshToken,
    accessToken,
    expiresIn: typeof expiresIn === "number" ? expiresIn : 3600,
  };
}

/**
 * Renova o access_token a partir do refresh_token.
 * Usar quando token expirado ou antes de chamadas à API.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number } | { error: string }> {
  const clientId = getGoogleAdsClientId();
  const clientSecret = getGoogleAdsClientSecret();

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const res = await fetch(getGoogleOAuthTokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok) {
    const msg =
      data.error_description ?? data.error ?? `HTTP ${res.status}`;
    return { error: msg };
  }

  const accessToken = data.access_token;
  const expiresIn = data.expires_in;

  if (!accessToken) {
    return { error: "Resposta OAuth sem access_token" };
  }

  return {
    accessToken,
    expiresIn: typeof expiresIn === "number" ? expiresIn : 3600,
  };
}

/**
 * Lista os customer IDs acessíveis com o access_token atual.
 * Não requer customer_id na requisição; retorna contas com acesso direto.
 */
export async function getAccessibleCustomers(
  accessToken: string
): Promise<string[] | { error: string }> {
  const res = await fetch(LIST_ACCESSIBLE_CUSTOMERS_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = (await res.json()) as {
    resourceNames?: string[];
    error?: { message?: string };
  };

  if (!res.ok) {
    const msg = data.error?.message ?? `HTTP ${res.status}`;
    return { error: msg };
  }

  const resourceNames = data.resourceNames;
  if (!Array.isArray(resourceNames)) {
    return { error: "Resposta sem resourceNames" };
  }

  const customerIds = resourceNames
    .filter((r): r is string => typeof r === "string")
    .map((r) => r.replace(/^customers\//i, ""))
    .filter((id) => /^\d+$/.test(id));

  return customerIds;
}
