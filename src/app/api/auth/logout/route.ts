/**
 * POST /api/auth/logout — invalida a sessão atual, limpa o cookie e redireciona para /login.
 */
import { NextRequest, NextResponse } from "next/server";
import { invalidateCurrent, buildClearCookieHeader } from "@/server/auth";

export async function POST(request: NextRequest) {
  await invalidateCurrent(request);
  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl, 302);
  response.headers.set("Set-Cookie", buildClearCookieHeader());
  return response;
}
