import nodemailer from "nodemailer";

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getSmtpConfig() {
  // Compatibilidade com convencoes diferentes (nativas e estilo Chatwoot/Rails).
  const host = process.env.SMTP_HOST || process.env.SMTP_ADDRESS;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER || process.env.SMTP_USERNAME;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const secure =
    process.env.SMTP_SECURE === "true" ||
    process.env.SMTP_SSL === "true" ||
    port === 465;
  const from =
    process.env.SMTP_FROM ||
    process.env.MAILER_SENDER_EMAIL ||
    "hub@creativelane.io";
  const replyTo =
    process.env.SMTP_REPLY_TO ||
    process.env.MAILER_INBOUND_EMAIL_DOMAIN ||
    undefined;
  const requireTls = process.env.SMTP_ENABLE_STARTTLS_AUTO === "true";
  const authMethod = process.env.SMTP_AUTHENTICATION || undefined;
  const enabled = process.env.SMTP_ENABLED === "true";

  return {
    enabled,
    host,
    port,
    user,
    pass,
    secure,
    from,
    replyTo,
    requireTls,
    authMethod,
  };
}

export async function sendEmail(payload: MailPayload): Promise<{ ok: boolean; error?: string }> {
  const cfg = getSmtpConfig();
  if (!cfg.enabled) {
    return { ok: false, error: "SMTP desabilitado por feature flag (SMTP_ENABLED=false)." };
  }
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return { ok: false, error: "SMTP incompleto. Defina SMTP_HOST/SMTP_USER/SMTP_PASS." };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      requireTLS: cfg.requireTls,
      tls: {
        rejectUnauthorized: (process.env.SMTP_OPENSSL_VERIFY_MODE ?? "peer") === "peer",
      },
      auth: {
        user: cfg.user,
        pass: cfg.pass,
        method: cfg.authMethod,
      },
    });
    await transporter.sendMail({
      from: cfg.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: cfg.replyTo,
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
