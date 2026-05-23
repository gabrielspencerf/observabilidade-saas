/**
 * POST /api/admin/users — criar usuário (super_admin).
 */
import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { createUser } from "@/server/admin/users";
import { authFeatures } from "@/server/auth";
import { sendInitialAccessEmail } from "@/server/auth/password-reset";
import { adminApiAuthErrorResponse } from "@/server/admin/api-route-errors";
import { apiError, apiOk } from "@/server/http/api-contract";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (err) {
    return adminApiAuthErrorResponse(err);
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
    return apiError("invalid_body", "Corpo inválido", { status: 400 });
  }

  const result = await createUser({
    name: body.name ?? null,
    email: body.email ?? "",
    password: body.password,
    isActive: body.is_active ?? true,
  });

  if ("error" in result) {
    const isValidation =
      result.error.includes("obrigatório") ||
      result.error.includes("mínimo") ||
      result.error.includes("longo");
    return apiError(
      isValidation ? "invalid_payload" : "duplicate_resource",
      result.error,
      { status: isValidation ? 400 : 409 }
    );
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

  return apiOk({ id: result.id, accessEmail }, { status: 201 });
}
