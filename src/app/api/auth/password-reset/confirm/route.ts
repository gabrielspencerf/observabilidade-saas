import { NextRequest, NextResponse } from "next/server";
import { authFeatures } from "@/server/auth";
import { resetPasswordByToken } from "@/server/auth/password-reset";

export async function POST(request: NextRequest) {
  if (!authFeatures.passwordResetEnabled) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  const result = await resetPasswordByToken({ token, newPassword: password });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
