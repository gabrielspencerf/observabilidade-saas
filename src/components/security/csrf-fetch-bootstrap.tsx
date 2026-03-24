"use client";

import { useEffect } from "react";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

function shouldAttachCsrf(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (init?.method ?? "GET").toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return false;
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  // Apenas same-origin: evita enviar token para terceiros.
  return url.startsWith("/") || url.startsWith(window.location.origin);
}

export function CsrfFetchBootstrap() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!shouldAttachCsrf(input, init)) {
        return originalFetch(input, init);
      }

      const token = readCookie("csrf_token");
      if (!token) {
        return originalFetch(input, init);
      }

      const headers = new Headers(init?.headers ?? {});
      if (!headers.has("x-csrf-token")) {
        headers.set("x-csrf-token", token);
      }

      return originalFetch(input, {
        ...init,
        headers,
      });
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
