/**
 * POST /api/auth/login — autenticação por email e senha.
 * Cria sessão, define current_tenant_id inicial, devolve cookie HTTP-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { users, memberships, tenants } from "@/db/schema";
import {
  createSession,
  buildSetCookieHeader,
  verifyPassword,
} from "@/server/auth";
import { chooseInitialTenantId } from "@/server/tenancy/choose-initial-tenant";
import { isSuperAdmin } from "@/server/tenancy/membership";

const GENERIC_ERROR_MESSAGE = "Credenciais inválidas";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido" },
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: GENERIC_ERROR_MESSAGE }, { status: 401 });
  }

  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !user.isActive) {
    return NextResponse.json({ error: GENERIC_ERROR_MESSAGE }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: GENERIC_ERROR_MESSAGE }, { status: 401 });
  }

  const membershipsWithTenant = await db
    .select({
      tenantId: tenants.id,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
    })
    .from(memberships)
    .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
    .where(eq(memberships.userId, user.id));

  const initialTenantId = chooseInitialTenantId(membershipsWithTenant);

  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  const token = await createSession({
    userId: user.id,
    currentTenantId: initialTenantId,
    ipAddress,
    userAgent,
  });

  const superAdmin = await isSuperAdmin(user.id);
  const response = NextResponse.json(
    { ok: true, isSuperAdmin: superAdmin },
    { status: 200 }
  );
  response.headers.set("Set-Cookie", buildSetCookieHeader(token));
  return response;
}
