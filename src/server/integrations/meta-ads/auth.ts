/**
 * OAuth Meta: troca de code por token de curta duração e extensão para long-lived.
 */

import { getMetaAdsAppId, getMetaAdsAppSecret, getMetaAdsRedirectUri, graphApiBaseUrl } from "./config";

export interface MetaShortLivedTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface MetaLongLivedTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export async function exchangeCodeForShortLivedToken(
  code: string
): Promise<MetaShortLivedTokenResponse | { error: string }> {
  const clientId = getMetaAdsAppId();
  const clientSecret = getMetaAdsAppSecret();
  const redirectUri = getMetaAdsRedirectUri();
  const url = new URL(`${graphApiBaseUrl()}/oauth/access_token`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString(), { method: "GET" });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (!res.ok || !data.access_token) {
    const msg = data.error?.message ?? `HTTP ${res.status}`;
    return { error: msg };
  }

  return {
    accessToken: data.access_token,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : 3600,
  };
}

export async function exchangeForLongLivedUserToken(
  shortLivedToken: string
): Promise<MetaLongLivedTokenResponse | { error: string }> {
  const clientId = getMetaAdsAppId();
  const clientSecret = getMetaAdsAppSecret();
  const url = new URL(`${graphApiBaseUrl()}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (!res.ok || !data.access_token) {
    const msg = data.error?.message ?? `HTTP ${res.status}`;
    return { error: msg };
  }

  return {
    accessToken: data.access_token,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : 60 * 24 * 3600,
  };
}
