import { NextRequest, NextResponse } from "next/server";
import { authFeatures } from "@/server/auth";
import { checkRateLimit } from "@/server/security/rate-limit";
import { requestPasswordResetByEmail } from "@/server/auth/password-reset";

export async function POST(request: NextRequest) {
  if (!authFeatures.passwordResetEnabled) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const limiter = await checkRateLimit({
    request,
    bucket: "auth-password-reset-request",
    max: 5,
    windowSeconds: 15 * 60,
  });
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde e tente novamente." },
      { status: 429 }
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  await requestPasswordResetByEmail(email);
  return NextResponse.json({ ok: true }, { status: 200 });
}
