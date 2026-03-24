/**
 * POST /api/admin/users — criar usuário (super_admin).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { createUser } from "@/server/admin/users";
import { authFeatures } from "@/server/auth";
import { sendInitialAccessEmail } from "@/server/auth/password-reset";

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireAdmin(request);
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json(
      { error: e.status === 403 ? "Sem permissão" : "Não autenticado" },
      { status: e.status ?? 401 }
    );
  }

  let body: {
    name?: string | null;
    email?: string;
    password?: string;
    is_active?: boolean;
    send_access_email?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo inválido" },
      { status: 400 }
    );
  }

  const result = await createUser({
    name: body.name ?? null,
    email: body.email ?? "",
    password: body.password,
    isActive: body.is_active ?? true,
  });

  if ("error" in result) {
    const status =
      result.error.includes("obrigatório") ||
      result.error.includes("mínimo") ||
      result.error.includes("longo")
        ? 400
        : 409;
    return NextResponse.json({ error: result.error }, { status });
  }
  const sendAccessEmail = body.send_access_email ?? true;
  let accessEmail: { sent: boolean; error?: string } = { sent: false };
  if (authFeatures.passwordResetEnabled && sendAccessEmail) {
    const sent = await sendInitialAccessEmail({
      userId: result.id,
      email: result.email,
      name: result.name,
    });
    accessEmail = sent.ok
      ? { sent: true }
      : { sent: false, error: sent.error ?? "Falha ao enviar email inicial." };
  }

  return NextResponse.json({ id: result.id, accessEmail }, { status: 201 });
}
