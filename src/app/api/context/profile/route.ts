import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/server/auth";
import { getDb } from "@/server/db";
import { users } from "@/db/schema";
import { checkRateLimit } from "@/server/security/rate-limit";

export async function GET(request: NextRequest) {
  const session = await requireAuth(request).catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  return NextResponse.json({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
}

export async function PATCH(request: NextRequest) {
  let session;
  try {
    session = await requireAuth(request);
  } catch {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const limiter = await checkRateLimit({
    request,
    bucket: "profile:update",
    max: 20,
    windowSeconds: 60,
  });
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(limiter.retryAfterSeconds) },
      }
    );
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const name = body.name?.trim() || null;
  if (name && name.length > 255) {
    return NextResponse.json(
      { error: "Nome excede 255 caracteres" },
      { status: 400 }
    );
  }

  const db = getDb();
  await db
    .update(users)
    .set({ name, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true, name }, { status: 200 });
}
